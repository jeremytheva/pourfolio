import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractCreateTableBody = (sql, tableName) => {
  const pattern = new RegExp(
    'CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:`[^`]+`\\.)?`?' +
      escapeRegExp(tableName) +
      '`?\\s*\\(',
    'i'
  )
  const match = pattern.exec(sql)
  if (!match) return null

  const openIndex = match.index + match[0].lastIndexOf('(')
  let depth = 1
  let quote = null

  for (let index = openIndex + 1; index < sql.length; index += 1) {
    const character = sql[index]

    if (quote) {
      if (character === '\\') {
        index += 1
      } else if (character === quote && sql[index + 1] === quote) {
        index += 1
      } else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character
    } else if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
      if (depth === 0) return sql.slice(openIndex + 1, index)
    }
  }

  throw new Error(`CREATE TABLE ${tableName} has unbalanced parentheses.`)
}

const splitTopLevel = (value) => {
  const parts = []
  let part = ''
  let depth = 0
  let quote = null

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (quote) {
      part += character
      if (character === '\\') {
        part += value[index + 1] || ''
        index += 1
      } else if (character === quote && value[index + 1] === quote) {
        part += value[index + 1]
        index += 1
      } else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character
      part += character
    } else if (character === '(') {
      depth += 1
      part += character
    } else if (character === ')') {
      depth -= 1
      part += character
    } else if (character === ',' && depth === 0) {
      parts.push(part.trim())
      part = ''
    } else {
      part += character
    }
  }

  if (part.trim()) parts.push(part.trim())
  return parts
}

const normaliseIndexColumn = (value) => value
  .trim()
  .replace(/`/g, '')
  .replace(/\(\d+\)/g, '')
  .split(/\s+/)[0]
  .toLowerCase()

const parseTable = (sql, tableName) => {
  const body = extractCreateTableBody(sql, tableName)
  if (body === null) return null

  const definitions = splitTopLevel(body)
  const columns = new Map()
  const uniqueKeys = []

  for (const definition of definitions) {
    const column = /^`?([a-zA-Z0-9_]+)`?\s+(.+)$/s.exec(definition)
    if (column && !/^(primary|unique|key|constraint|foreign|check)$/i.test(column[1])) {
      columns.set(column[1].toLowerCase(), column[2].trim())
    }

    const key = /^(?:CONSTRAINT\s+`?[\w$]+`?\s+)?(?:PRIMARY\s+KEY|UNIQUE(?:\s+(?:KEY|INDEX))?(?:\s+`?[\w$]+`?)?)\s*\((.+)\)$/is.exec(definition)
    if (key) uniqueKeys.push(splitTopLevel(key[1]).map(normaliseIndexColumn))
  }

  return { columns, uniqueKeys }
}

const hasExactUniqueKey = (table, requiredColumns) => {
  const expected = requiredColumns.map((column) => column.toLowerCase())
  return table.uniqueKeys.some((columns) =>
    columns.length === expected.length &&
    columns.every((column, index) => column === expected[index])
  )
}

const TABLE_RULES = [
  {
    table: 'profiles',
    requiredColumns: ['user_id'],
    uniqueKeys: [['user_id']]
  },
  {
    table: 'ratings',
    requiredColumns: [
      'user_id', 'rating_id', 'product_id', 'date_rated', 'submission_key',
      'submission_fingerprint', 'submission_state', 'submission_version', 'expected_score_count',
      'expected_bonus_count'
    ],
    uniqueKeys: [['user_id', 'rating_id'], ['submission_key']]
  },
  {
    table: 'rating_scores',
    requiredColumns: ['user_id', 'rating_id', 'attribute_id', 'attribute_score', 'uniqueness_key'],
    uniqueKeys: [['rating_id', 'attribute_id'], ['uniqueness_key']]
  },
  {
    table: 'bonus_attribute_rating_mapping',
    requiredColumns: ['user_id', 'rating_id', 'bonus_attributes_id', 'uniqueness_key'],
    uniqueKeys: [['rating_id', 'bonus_attributes_id'], ['uniqueness_key']]
  }
]

export const auditSchemaContract = (sql) => {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new Error('Schema SQL is required.')
  }

  const blockers = []

  for (const rule of TABLE_RULES) {
    const table = parseTable(sql, rule.table)
    if (!table) {
      blockers.push({
        code: 'MISSING_TABLE',
        table: rule.table
      })
      continue
    }

    for (const columnName of rule.requiredColumns) {
      const definition = table.columns.get(columnName)
      if (!definition) {
        blockers.push({
          code: 'MISSING_REQUIRED_COLUMN',
          table: rule.table,
          column: columnName
        })
      } else if (!/\bNOT\s+NULL\b/i.test(definition)) {
        blockers.push({
          code: 'NULLABLE_REQUIRED_COLUMN',
          table: rule.table,
          column: columnName
        })
      }
    }

    for (const uniqueColumns of rule.uniqueKeys) {
      if (!hasExactUniqueKey(table, uniqueColumns)) {
        blockers.push({
          code: 'MISSING_UNIQUE_CONSTRAINT',
          table: rule.table,
          columns: uniqueColumns
        })
      }
    }

    if (rule.table === 'ratings') {
      const dateDefinition = table.columns.get('date_rated')
      if (dateDefinition && !/\bDEFAULT\s+(?:\(\s*)?CURRENT_TIMESTAMP(?:\s*\))?/i.test(dateDefinition)) {
        blockers.push({
          code: 'MISSING_RATING_TIMESTAMP_DEFAULT',
          table: 'ratings',
          column: 'date_rated'
        })
      }
      if (dateDefinition && /\bON\s+UPDATE\s+(?:\(\s*)?CURRENT_TIMESTAMP(?:\s*\))?/i.test(dateDefinition)) {
        blockers.push({
          code: 'MUTABLE_RATING_TIMESTAMP_DEFAULT',
          table: 'ratings',
          column: 'date_rated'
        })
      }
    }
  }

  const countsByCode = blockers.reduce((counts, blocker) => {
    counts[blocker.code] = (counts[blocker.code] || 0) + 1
    return counts
  }, {})

  return {
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: {
      tablesChecked: TABLE_RULES.length,
      blockers: blockers.length
    },
    countsByCode,
    blockers
  }
}

const parseArguments = (arguments_) => {
  if (arguments_.length !== 2 || arguments_[0] !== '--schema' || !arguments_[1]) {
    throw new Error('Use --schema followed by the path to a SQL schema export.')
  }
  return { schema: arguments_[1] }
}

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const sql = fs.readFileSync(path.resolve(options.schema), 'utf8')
  const report = auditSchemaContract(sql)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  return report.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}
