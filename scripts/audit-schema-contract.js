import fs from 'node:fs'
import { createHash } from 'node:crypto'
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
  const foreignKeys = []
  const checks = []

  for (const definition of definitions) {
    const column = /^`?([a-zA-Z0-9_]+)`?\s+(.+)$/s.exec(definition)
    if (column && !/^(primary|unique|key|constraint|foreign|check)$/i.test(column[1])) {
      columns.set(column[1].toLowerCase(), column[2].trim())
    }

    const key = /^(?:CONSTRAINT\s+`?[\w$]+`?\s+)?(?:PRIMARY\s+KEY|UNIQUE(?:\s+(?:KEY|INDEX))?(?:\s+`?[\w$]+`?)?)\s*\((.+)\)$/is.exec(definition)
    if (key) uniqueKeys.push(splitTopLevel(key[1]).map(normaliseIndexColumn))

    const foreignKey = /^(?:CONSTRAINT\s+`?[\w$]+`?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(?:`[^`]+`\.)?`?([\w$]+)`?\s*\(([^)]+)\)/is.exec(definition)
    if (foreignKey) {
      foreignKeys.push({
        columns: splitTopLevel(foreignKey[1]).map(normaliseIndexColumn),
        parentTable: foreignKey[2].toLowerCase(),
        parentColumns: splitTopLevel(foreignKey[3]).map(normaliseIndexColumn)
      })
    }

    const check = /(?:^|\s)CHECK\s*\((.*)\)\s*$/is.exec(definition)
    if (check) checks.push(check[1])
  }

  return { columns, uniqueKeys, foreignKeys, checks }
}

const hasExactUniqueKey = (table, requiredColumns) => {
  const expected = requiredColumns.map((column) => column.toLowerCase())
  return table.uniqueKeys.some((columns) =>
    columns.length === expected.length &&
    columns.every((column, index) => column === expected[index])
  )
}

const hasForeignKey = (table, relationship) => table.foreignKeys.some((foreignKey) =>
  foreignKey.columns.length === 1 &&
  foreignKey.columns[0] === relationship.column &&
  foreignKey.parentTable === relationship.parentTable &&
  foreignKey.parentColumns.length === 1 &&
  foreignKey.parentColumns[0] === relationship.parentColumn
)

const normaliseCheck = (value) => value
  .replace(/`/g, '')
  .replace(/\s+/g, '')
  .replace(/^\((.*)\)$/s, '$1')
  .toLowerCase()

const hasCheck = (table, predicates) => table.checks.some((check) => {
  const expression = normaliseCheck(check)
  return predicates.some((predicate) => predicate(expression))
})

const isIntegerDefinition = (definition = '') => /^(?:tinyint|smallint|mediumint|int|integer|bigint)\b/i.test(definition)

const hasNonNegativeCheck = (table, column) => hasCheck(table, [
  (expression) => expression.includes(`${column}>=0`),
  (expression) => expression.includes(`0<=${column}`)
])

const hasNonNegativeIntegerEnforcement = (table, column) => {
  const definition = table.columns.get(column)
  return isIntegerDefinition(definition) && (/\bunsigned\b/i.test(definition) || hasNonNegativeCheck(table, column))
}

const hasScoreRangeCheck = (table) => hasCheck(table, [
  (expression) => expression.includes('attribute_scorebetween1and7'),
  (expression) => expression.includes('attribute_score>=1') && expression.includes('attribute_score<=7'),
  (expression) => expression.includes('1<=attribute_score') && expression.includes('7>=attribute_score')
])

const hasSubmissionStateEnforcement = (table) => {
  const definition = normaliseCheck(table.columns.get('submission_state') || '')
  const allowedValues = ['complete', 'deleted', 'deleting', 'failed', 'pending']
  const enumMatch = /^enum\(([^)]+)\)/.exec(definition)
  if (enumMatch) {
    const values = enumMatch[1].split(',').map((value) => value.replaceAll("'", '')).sort()
    if (values.length === allowedValues.length && values.every((value, index) => value === allowedValues[index])) return true
  }

  return hasCheck(table, [(expression) => {
    const match = /submission_statein\(([^)]+)\)/.exec(expression)
    if (!match) return false
    const values = match[1].split(',').map((value) => value.replaceAll("'", '')).sort()
    return values.length === allowedValues.length && values.every((value, index) => value === allowedValues[index])
  }])
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
    requiredNullableColumns: ['deleted_at'],
    uniqueKeys: [['user_id', 'rating_id'], ['submission_key']],
    foreignKeys: [
      { column: 'product_id', parentTable: 'products', parentColumn: 'id' }
    ],
    optionalForeignKeys: [
      { column: 'cellar_id', parentTable: 'cellar', parentColumn: 'id' }
    ]
  },
  {
    table: 'rating_scores',
    requiredColumns: ['user_id', 'rating_id', 'attribute_id', 'attribute_score', 'uniqueness_key'],
    uniqueKeys: [['rating_id', 'attribute_id'], ['uniqueness_key']],
    foreignKeys: [
      { column: 'rating_id', parentTable: 'ratings', parentColumn: 'id' },
      { column: 'attribute_id', parentTable: 'rating_attributes', parentColumn: 'id' }
    ]
  },
  {
    table: 'bonus_attribute_rating_mapping',
    requiredColumns: ['user_id', 'rating_id', 'bonus_attributes_id', 'uniqueness_key'],
    uniqueKeys: [['rating_id', 'bonus_attributes_id'], ['uniqueness_key']],
    foreignKeys: [
      { column: 'rating_id', parentTable: 'ratings', parentColumn: 'id' },
      { column: 'bonus_attributes_id', parentTable: 'bonus_attributes', parentColumn: 'id' }
    ]
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

    for (const columnName of rule.requiredNullableColumns || []) {
      const definition = table.columns.get(columnName)
      if (!definition) {
        blockers.push({
          code: 'MISSING_REQUIRED_COLUMN',
          table: rule.table,
          column: columnName
        })
      } else if (/\bNOT\s+NULL\b/i.test(definition)) {
        blockers.push({
          code: 'NON_NULLABLE_REQUIRED_COLUMN',
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

    for (const relationship of rule.foreignKeys || []) {
      if (!hasForeignKey(table, relationship)) {
        blockers.push({ code: 'MISSING_FOREIGN_KEY', table: rule.table, ...relationship })
      }
    }

    for (const relationship of rule.optionalForeignKeys || []) {
      if (table.columns.has(relationship.column) && !hasForeignKey(table, relationship)) {
        blockers.push({ code: 'MISSING_FOREIGN_KEY', table: rule.table, ...relationship })
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
      for (const column of ['submission_version', 'expected_score_count', 'expected_bonus_count']) {
        if (table.columns.has(column) &&
            !hasNonNegativeIntegerEnforcement(table, column)) {
          blockers.push({ code: 'MISSING_NON_NEGATIVE_INTEGER_ENFORCEMENT', table: 'ratings', column })
        }
      }
      if (table.columns.has('submission_state') && !hasSubmissionStateEnforcement(table)) {
        blockers.push({ code: 'MISSING_SUBMISSION_STATE_CHECK', table: 'ratings', column: 'submission_state' })
      }
    }

    if (rule.table === 'rating_scores' && table.columns.has('attribute_score') &&
        (!isIntegerDefinition(table.columns.get('attribute_score')) || !hasScoreRangeCheck(table))) {
      blockers.push({ code: 'MISSING_SCORE_INTEGER_RANGE_ENFORCEMENT', table: 'rating_scores', column: 'attribute_score' })
    }
  }

  const countsByCode = blockers.reduce((counts, blocker) => {
    counts[blocker.code] = (counts[blocker.code] || 0) + 1
    return counts
  }, {})

  return {
    reportType: 'STRUCTURAL_SQL_AUDIT',
    scope: 'Structural SQL invariants only; connected provider policy and workflow certification is required separately.',
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: {
      tablesChecked: TABLE_RULES.length,
      blockers: blockers.length
    },
    countsByCode,
    blockers
  }
}

export const fingerprintSchema = (contents) => {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex')
  }
}

const parseArguments = (arguments_) => {
  if (!arguments_.length || arguments_.length % 2 !== 0) {
    throw new Error('Use --schema <path> with optional --output <path>.')
  }

  const options = {}
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    if (!['--schema', '--output'].includes(key) || !value || options[key.slice(2)]) {
      throw new Error('Use --schema <path> with optional --output <path>.')
    }
    options[key.slice(2)] = value
  }
  if (!options.schema) throw new Error('Use --schema <path> with optional --output <path>.')
  return options
}

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const schemaPath = path.resolve(options.schema)
  const contents = fs.readFileSync(schemaPath)
  const report = {
    ...auditSchemaContract(contents.toString('utf8')),
    inputs: {
      schema: {
        file: path.basename(schemaPath),
        ...fingerprintSchema(contents)
      }
    }
  }
  const rendered = `${JSON.stringify(report, null, 2)}\n`
  if (options.output) fs.writeFileSync(path.resolve(options.output), rendered)
  process.stdout.write(rendered)
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
