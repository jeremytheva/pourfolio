import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  fingerprintSchema,
  listSchemaTables,
  parseSchemaTable
} from './audit-schema-contract.js'

const REQUIRED_BASELINE_TABLES = [
  'ratings',
  'rating_scores',
  'bonus_attribute_rating_mapping'
]

const ADDITIVE_COLUMNS = {
  ratings: [
    'submission_key',
    'submission_fingerprint',
    'submission_state',
    'submission_version',
    'expected_score_count',
    'expected_bonus_count',
    'deleted_at'
  ],
  rating_scores: ['uniqueness_key'],
  bonus_attribute_rating_mapping: ['uniqueness_key']
}

const PROFILE_REQUIRED_COLUMNS = [
  'id',
  'user_id',
  'name',
  'description',
  'avatar_url'
]

const PROFILE_ALLOWED_COLUMNS = new Set([
  ...PROFILE_REQUIRED_COLUMNS,
  'created_at',
  'updated_at'
])

const normaliseDefinition = (value = '') => value
  .replace(/`/g, '')
  .replace(/\bcurrent_timestamp\s*\(\s*\)/gi, 'current_timestamp')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const normaliseCheck = (value = '') => value
  .replace(/`/g, '')
  .replace(/\s+/g, '')
  .replace(/^\((.*)\)$/s, '$1')
  .toLowerCase()

const canonicalColumns = (values = []) => values
  .map((columns) => columns.join(','))
  .sort()

const canonicalForeignKeys = (values = []) => values
  .map((foreignKey) => [
    foreignKey.columns.join(','),
    foreignKey.parentTable,
    foreignKey.parentColumns.join(','),
    foreignKey.onDelete || '',
    foreignKey.onUpdate || ''
  ].join('->'))
  .sort()

const sameValues = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const defaultValue = (definition) => {
  const match = /\bdefault\s+(\([^)]*\)|'[^']*'|"[^"]*"|[^\s,]+)/i.exec(definition)
  if (!match) return null
  return match[1].replace(/^\((.*)\)$/s, '$1').trim().toLowerCase()
}

const varcharLength = (definition) => {
  const match = /^(?:var)?char\s*\(\s*(\d+)\s*\)/i.exec(definition)
  return match ? Number(match[1]) : null
}

const isInteger = (definition) => /^(?:tinyint|smallint|mediumint|int|integer|bigint)\b/i.test(definition)

const addColumnBlockers = (table, column, definition, blockers) => {
  const normalised = normaliseDefinition(definition)
  const addition = { table, column }

  if (/\bnot\s+null\b/i.test(definition)) {
    blockers.push({ code: 'ADDITIVE_COLUMN_NOT_NULL', ...addition })
  }

  const configuredDefault = defaultValue(definition)
  if (configuredDefault !== null && configuredDefault !== 'null') {
    blockers.push({
      code: 'ADDITIVE_COLUMN_NON_NULL_DEFAULT',
      ...addition,
      default: configuredDefault
    })
  }

  const requireVarchar = (minimum) => {
    const length = varcharLength(normalised)
    if (length === null || length < minimum) {
      blockers.push({ code: 'ADDITIVE_COLUMN_INCOMPATIBLE_TYPE', ...addition })
    }
  }

  if (['submission_key', 'uniqueness_key'].includes(column)) {
    requireVarchar(255)
  } else if (column === 'submission_fingerprint') {
    requireVarchar(64)
  } else if (column === 'submission_state') {
    const enumMatch = /^enum\s*\(([^)]+)\)/i.exec(normalised)
    const allowed = ['complete', 'deleted', 'deleting', 'failed', 'pending']
    const values = enumMatch
      ? enumMatch[1].split(',').map((value) => value.trim().replace(/^['"]|['"]$/g, '')).sort()
      : []
    if (!sameValues(values, allowed)) {
      blockers.push({ code: 'ADDITIVE_COLUMN_INCOMPATIBLE_TYPE', ...addition })
    }
  } else if (['submission_version', 'expected_score_count', 'expected_bonus_count'].includes(column)) {
    if (!isInteger(normalised) || !/\bunsigned\b/i.test(normalised)) {
      blockers.push({ code: 'ADDITIVE_COLUMN_INCOMPATIBLE_TYPE', ...addition })
    }
  } else if (column === 'deleted_at' && !/^(?:timestamp|datetime)\b/i.test(normalised)) {
    blockers.push({ code: 'ADDITIVE_COLUMN_INCOMPATIBLE_TYPE', ...addition })
  }
}

const compareBaselineStructure = (tableName, baseline, candidate, blockers) => {
  for (const [column, definition] of baseline.columns) {
    const candidateDefinition = candidate.columns.get(column)
    if (!candidateDefinition) {
      blockers.push({ code: 'BASELINE_COLUMN_REMOVED', table: tableName, column })
    } else if (normaliseDefinition(definition) !== normaliseDefinition(candidateDefinition)) {
      blockers.push({ code: 'BASELINE_COLUMN_CHANGED', table: tableName, column })
    }
  }

  const structuralComparisons = [
    ['BASELINE_UNIQUE_KEYS_CHANGED', canonicalColumns(baseline.uniqueKeys), canonicalColumns(candidate.uniqueKeys)],
    ['BASELINE_INDEXES_CHANGED', canonicalColumns(baseline.indexes), canonicalColumns(candidate.indexes)],
    ['BASELINE_FOREIGN_KEYS_CHANGED', canonicalForeignKeys(baseline.foreignKeys), canonicalForeignKeys(candidate.foreignKeys)],
    ['BASELINE_CHECKS_CHANGED', baseline.checks.map(normaliseCheck).sort(), candidate.checks.map(normaliseCheck).sort()]
  ]

  for (const [code, expected, actual] of structuralComparisons) {
    if (!sameValues(expected, actual)) blockers.push({ code, table: tableName })
  }

  if (normaliseDefinition(baseline.options) !== normaliseDefinition(candidate.options)) {
    blockers.push({ code: 'BASELINE_TABLE_OPTIONS_CHANGED', table: tableName })
  }
}

const auditProfileTable = (candidate, blockers) => {
  for (const column of PROFILE_REQUIRED_COLUMNS) {
    if (!candidate.columns.has(column)) {
      blockers.push({ code: 'PROFILE_COLUMN_MISSING', table: 'profiles', column })
    }
  }

  for (const [column, definition] of candidate.columns) {
    if (!PROFILE_ALLOWED_COLUMNS.has(column)) {
      blockers.push({
        code: /(?:email|password|token|secret|role|permission|auth)/i.test(column)
          ? 'PROFILE_SENSITIVE_COLUMN'
          : 'PROFILE_UNEXPECTED_COLUMN',
        table: 'profiles',
        column
      })
    }

    if (['user_id', 'name', 'description', 'avatar_url'].includes(column)) {
      if (/\bnot\s+null\b/i.test(definition)) {
        blockers.push({ code: 'PROFILE_COMPATIBILITY_COLUMN_NOT_NULL', table: 'profiles', column })
      }
      const configuredDefault = defaultValue(definition)
      if (configuredDefault !== null && configuredDefault !== 'null') {
        blockers.push({ code: 'PROFILE_COMPATIBILITY_COLUMN_NON_NULL_DEFAULT', table: 'profiles', column })
      }
    }
  }

  const typeRules = [
    ['user_id', (definition) => (varcharLength(normaliseDefinition(definition)) || 0) >= 64],
    ['name', (definition) => (varcharLength(normaliseDefinition(definition)) || 0) >= 255],
    ['description', (definition) => /^(?:text|mediumtext|longtext)\b/i.test(normaliseDefinition(definition))],
    ['avatar_url', (definition) => (varcharLength(normaliseDefinition(definition)) || 0) >= 2048]
  ]

  for (const [column, accepts] of typeRules) {
    const definition = candidate.columns.get(column)
    if (definition && !accepts(definition)) {
      blockers.push({ code: 'PROFILE_COLUMN_INCOMPATIBLE_TYPE', table: 'profiles', column })
    }
  }

  const uniqueKeys = canonicalColumns(candidate.uniqueKeys)
  if (!sameValues(uniqueKeys, ['id'])) {
    blockers.push({ code: 'PROFILE_NON_ADDITIVE_UNIQUE_CONTROL', table: 'profiles' })
  }
  if (candidate.indexes.length) blockers.push({ code: 'PROFILE_UNREVIEWED_INDEX', table: 'profiles' })
  if (candidate.foreignKeys.length) blockers.push({ code: 'PROFILE_UNEXPECTED_FOREIGN_KEY', table: 'profiles' })
  if (candidate.checks.length) blockers.push({ code: 'PROFILE_UNEXPECTED_CHECK', table: 'profiles' })
}

export const auditAdditiveSchemaContract = (baselineSql, candidateSql) => {
  const baselineTables = listSchemaTables(baselineSql)
  const candidateTables = listSchemaTables(candidateSql)
  const baselineSet = new Set(baselineTables)
  const candidateSet = new Set(candidateTables)
  const blockers = []

  for (const table of REQUIRED_BASELINE_TABLES) {
    if (!baselineSet.has(table)) blockers.push({ code: 'BASELINE_REQUIRED_TABLE_MISSING', table })
  }
  if (baselineSet.has('profiles')) blockers.push({ code: 'BASELINE_ALREADY_CONTAINS_PROFILES', table: 'profiles' })

  for (const table of baselineTables) {
    if (!candidateSet.has(table)) blockers.push({ code: 'BASELINE_TABLE_REMOVED', table })
  }
  for (const table of candidateTables) {
    if (!baselineSet.has(table) && table !== 'profiles') {
      blockers.push({ code: 'UNAPPROVED_TABLE_ADDED', table })
    }
  }

  if (!candidateSet.has('profiles')) {
    blockers.push({ code: 'PROFILE_TABLE_MISSING', table: 'profiles' })
  } else {
    auditProfileTable(parseSchemaTable(candidateSql, 'profiles'), blockers)
  }

  for (const table of baselineTables) {
    if (!candidateSet.has(table)) continue
    const baseline = parseSchemaTable(baselineSql, table)
    const candidate = parseSchemaTable(candidateSql, table)
    compareBaselineStructure(table, baseline, candidate, blockers)

    const allowed = new Set(ADDITIVE_COLUMNS[table] || [])
    for (const column of candidate.columns.keys()) {
      if (!baseline.columns.has(column) && !allowed.has(column)) {
        blockers.push({ code: 'UNAPPROVED_COLUMN_ADDED', table, column })
      }
    }

    for (const column of allowed) {
      const definition = candidate.columns.get(column)
      if (!definition) {
        blockers.push({ code: 'ADDITIVE_COLUMN_MISSING', table, column })
      } else if (!baseline.columns.has(column)) {
        addColumnBlockers(table, column, definition, blockers)
      } else {
        blockers.push({ code: 'ADDITIVE_COLUMN_ALREADY_IN_BASELINE', table, column })
      }
    }
  }

  const countsByCode = blockers.reduce((counts, blocker) => {
    counts[blocker.code] = (counts[blocker.code] || 0) + 1
    return counts
  }, {})

  return {
    reportType: 'ADDITIVE_SCHEMA_AUDIT',
    scope: 'Checkpoint S1 structural delta only; data counts, timestamp digests, gateway compatibility, provider job identity and approvals require separate connected evidence.',
    planId: 'PF-P1-S1-ADDITIVE-COMPATIBILITY-V1',
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: {
      baselineTables: baselineTables.length,
      candidateTables: candidateTables.length,
      approvedNewColumns: Object.values(ADDITIVE_COLUMNS).flat().length,
      blockers: blockers.length
    },
    countsByCode,
    blockers
  }
}

const parseArguments = (arguments_) => {
  if (!arguments_.length || arguments_.length % 2 !== 0) {
    throw new Error('Use --baseline <path> --candidate <path> with optional --output <path>.')
  }

  const options = {}
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    if (!['--baseline', '--candidate', '--output'].includes(key) || !value || options[key.slice(2)]) {
      throw new Error('Use --baseline <path> --candidate <path> with optional --output <path>.')
    }
    options[key.slice(2)] = value
  }
  if (!options.baseline || !options.candidate) {
    throw new Error('Use --baseline <path> --candidate <path> with optional --output <path>.')
  }
  return options
}

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const baselinePath = path.resolve(options.baseline)
  const candidatePath = path.resolve(options.candidate)
  const baseline = fs.readFileSync(baselinePath)
  const candidate = fs.readFileSync(candidatePath)
  const report = {
    ...auditAdditiveSchemaContract(baseline.toString('utf8'), candidate.toString('utf8')),
    inputs: {
      baseline: {
        file: path.basename(baselinePath),
        ...fingerprintSchema(baseline)
      },
      candidate: {
        file: path.basename(candidatePath),
        ...fingerprintSchema(candidate)
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