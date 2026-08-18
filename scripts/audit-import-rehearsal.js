import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  countByCode,
  FULL_COMMIT_SHA,
  isNonNegativeInteger,
  isUtcTimestamp,
  readCsvEvidence,
  SHA256,
  textValue
} from './audit-evidence-utils.js'

export const IMPORT_REHEARSAL_PLAN_ID = 'PF-P1-HISTORICAL-IMPORT-REHEARSAL-V1'

export const IMPORT_REHEARSAL_COLLECTIONS = [
  'products',
  'producers',
  'categories',
  'ratings',
  'rating_scores',
  'rating_attributes',
  'bonus_attributes',
  'bonus_attribute_rating_mapping',
  'profiles',
  'cellar'
]

const IMPORT_TARGETS = {
  ratings: 'accepted_ratings',
  rating_scores: 'accepted_scores',
  bonus_attribute_rating_mapping: 'accepted_bonus_selections',
  cellar: 'accepted_cellar_rows'
}

const NON_TARGETS = IMPORT_REHEARSAL_COLLECTIONS.filter((collection) => !(collection in IMPORT_TARGETS))

export const ORPHAN_CHECKS = [
  'products_without_producer',
  'products_without_category',
  'ratings_without_product',
  'ratings_without_profile',
  'scores_without_rating',
  'scores_without_attribute',
  'bonus_mappings_without_rating',
  'bonus_mappings_without_attribute',
  'cellar_without_product',
  'cellar_without_profile'
]

export const DUPLICATE_CHECKS = [
  'ratings_owner_rating_id',
  'ratings_submission_key',
  'rating_scores_parent_attribute',
  'rating_scores_uniqueness_key',
  'bonus_mappings_parent_attribute',
  'bonus_mappings_uniqueness_key',
  'cellar_destination_id'
]

const EXPECTED_FIXED = {
  source_ratings: 604,
  accepted_ratings: 593,
  rejected_ratings: 11,
  source_scores: 4192,
  accepted_scores: 4177,
  rejected_scores: 15,
  source_bonus_selections: 1785,
  source_cellar_rows: 399,
  accepted_cellar_rows: 399,
  rejected_cellar_rows: 0,
  source_rating_cellar_relationships: 593,
  linked_rating_cellar_relationships: 592,
  intentional_null_rating_cellar_relationships: 1
}

const addBlocker = (blockers, code, details = {}) => blockers.push({ code, ...details })

const checkReviewMetadata = (manifest, blockers) => {
  if (manifest.plan_id !== IMPORT_REHEARSAL_PLAN_ID) {
    addBlocker(blockers, 'PLAN_ID_INVALID', { expected: IMPORT_REHEARSAL_PLAN_ID })
  }
  for (const field of ['environment', 'deployment_id', 'evidence_reference', 'operator', 'reviewer']) {
    if (!textValue(manifest[field])) addBlocker(blockers, 'MANIFEST_FIELD_MISSING', { field })
  }
  if (manifest.review_decision !== 'approved') addBlocker(blockers, 'REVIEW_DECISION_INVALID')
  if (!FULL_COMMIT_SHA.test(textValue(manifest.release_sha))) addBlocker(blockers, 'RELEASE_SHA_INVALID')
  if (!SHA256.test(textValue(manifest.source_bundle_sha256))) addBlocker(blockers, 'SOURCE_BUNDLE_SHA256_INVALID')
  if (!isUtcTimestamp(manifest.reviewed_at)) addBlocker(blockers, 'UTC_TIMESTAMP_INVALID', { field: 'reviewed_at' })
  if (
    textValue(manifest.operator) &&
    textValue(manifest.operator).toLowerCase() === textValue(manifest.reviewer).toLowerCase()
  ) {
    addBlocker(blockers, 'REVIEWER_NOT_INDEPENDENT')
  }
}

const checkExpectedCounts = (expected, blockers) => {
  if (!expected || typeof expected !== 'object') {
    addBlocker(blockers, 'EXPECTED_COUNTS_MISSING')
    return
  }
  for (const [field, required] of Object.entries(EXPECTED_FIXED)) {
    if (expected[field] !== required) addBlocker(blockers, 'EXPECTED_COUNT_MISMATCH', { field, expected: required })
  }
  for (const field of ['accepted_bonus_selections', 'rejected_bonus_selections']) {
    if (!isNonNegativeInteger(expected[field])) addBlocker(blockers, 'EXPECTED_COUNT_INVALID', { field })
  }
  if (
    isNonNegativeInteger(expected.accepted_bonus_selections) &&
    isNonNegativeInteger(expected.rejected_bonus_selections) &&
    expected.accepted_bonus_selections + expected.rejected_bonus_selections !== EXPECTED_FIXED.source_bonus_selections
  ) {
    addBlocker(blockers, 'BONUS_SELECTION_TOTAL_MISMATCH')
  }
  if (expected.accepted_ratings + expected.rejected_ratings !== expected.source_ratings) {
    addBlocker(blockers, 'RATING_TOTAL_MISMATCH')
  }
  if (expected.accepted_scores + expected.rejected_scores !== expected.source_scores) {
    addBlocker(blockers, 'SCORE_TOTAL_MISMATCH')
  }
  if (expected.accepted_cellar_rows + expected.rejected_cellar_rows !== expected.source_cellar_rows) {
    addBlocker(blockers, 'CELLAR_TOTAL_MISMATCH')
  }
  if (
    expected.linked_rating_cellar_relationships + expected.intentional_null_rating_cellar_relationships !==
    expected.source_rating_cellar_relationships
  ) {
    addBlocker(blockers, 'RATING_CELLAR_TOTAL_MISMATCH')
  }
}

const checkAggregateZeroes = (values, requiredFields, runName, kind, blockers) => {
  if (!values || typeof values !== 'object') {
    addBlocker(blockers, 'RUN_CHECKS_MISSING', { run: runName, kind })
    return
  }
  for (const field of requiredFields) {
    if (values[field] !== 0) {
      addBlocker(blockers, 'RUN_CHECK_NON_ZERO', { run: runName, kind, field, count: values[field] ?? null })
    }
  }
}

const checkMutationMap = (run, runName, expected, blockers) => {
  for (const kind of ['created', 'updated', 'deleted']) {
    const values = run?.mutations?.[kind]
    if (!values || typeof values !== 'object') {
      addBlocker(blockers, 'RUN_MUTATIONS_MISSING', { run: runName, kind })
      continue
    }
    for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
      if (!isNonNegativeInteger(values[collection])) {
        addBlocker(blockers, 'RUN_MUTATION_COUNT_INVALID', { run: runName, kind, collection })
      }
    }
  }

  if (runName === 'first') {
    for (const [collection, field] of Object.entries(IMPORT_TARGETS)) {
      if (run?.mutations?.created?.[collection] !== expected?.[field]) {
        addBlocker(blockers, 'FIRST_RUN_CREATE_COUNT_MISMATCH', { collection, expected: expected?.[field] ?? null })
      }
    }
    for (const collection of NON_TARGETS) {
      if (run?.mutations?.created?.[collection] !== 0) {
        addBlocker(blockers, 'FIRST_RUN_UNEXPECTED_CREATE', { collection })
      }
    }
    for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
      if (run?.mutations?.updated?.[collection] !== 0) addBlocker(blockers, 'FIRST_RUN_UNEXPECTED_UPDATE', { collection })
      if (run?.mutations?.deleted?.[collection] !== 0) addBlocker(blockers, 'FIRST_RUN_UNEXPECTED_DELETE', { collection })
    }
  } else if (runName === 'rerun') {
    for (const kind of ['created', 'updated', 'deleted']) {
      for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
        if (run?.mutations?.[kind]?.[collection] !== 0) {
          addBlocker(blockers, 'RERUN_MUTATION_NON_ZERO', { kind, collection })
        }
      }
    }
  }
}

const readRun = (manifestPath, run, runName, blockers) => {
  if (!run || typeof run !== 'object') {
    addBlocker(blockers, 'RUN_MISSING', { run: runName })
    return null
  }
  for (const field of ['run_id', 'started_at', 'completed_at', 'provider_log_reference']) {
    if (!textValue(run[field])) addBlocker(blockers, 'RUN_FIELD_MISSING', { run: runName, field })
  }
  for (const field of ['started_at', 'completed_at']) {
    if (!isUtcTimestamp(run[field])) addBlocker(blockers, 'UTC_TIMESTAMP_INVALID', { run: runName, field })
  }
  if (
    isUtcTimestamp(run.started_at) && isUtcTimestamp(run.completed_at) &&
    Date.parse(run.started_at) > Date.parse(run.completed_at)
  ) {
    addBlocker(blockers, 'RUN_INTERVAL_INVALID', { run: runName })
  }

  const result = {}
  for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
    const declared = run.collections?.[collection]
    if (!declared) {
      addBlocker(blockers, 'RUN_COLLECTION_MISSING', { run: runName, collection })
      continue
    }
    if (!isNonNegativeInteger(declared.rows)) addBlocker(blockers, 'RUN_COLLECTION_ROWS_INVALID', { run: runName, collection })
    if (!Number.isInteger(declared.bytes) || declared.bytes < 0) addBlocker(blockers, 'RUN_COLLECTION_BYTES_INVALID', { run: runName, collection })
    if (!SHA256.test(textValue(declared.sha256))) addBlocker(blockers, 'RUN_COLLECTION_SHA256_INVALID', { run: runName, collection })
    try {
      const evidence = readCsvEvidence(manifestPath, declared.file)
      result[collection] = {
        file: path.basename(evidence.file),
        rows: evidence.records.length,
        bytes: evidence.bytes,
        sha256: evidence.sha256
      }
      if (evidence.records.length !== declared.rows) addBlocker(blockers, 'RUN_COLLECTION_ROW_COUNT_MISMATCH', { run: runName, collection })
      if (evidence.bytes !== declared.bytes) addBlocker(blockers, 'RUN_COLLECTION_BYTES_MISMATCH', { run: runName, collection })
      if (evidence.sha256 !== declared.sha256) addBlocker(blockers, 'RUN_COLLECTION_SHA256_MISMATCH', { run: runName, collection })
    } catch {
      addBlocker(blockers, 'RUN_COLLECTION_READ_FAILED', { run: runName, collection })
    }
  }
  return result
}

const checkInventories = (before, first, rerun, expected, blockers) => {
  if (!before || !first || !rerun) return
  for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
    if (!before[collection] || !first[collection] || !rerun[collection]) continue
    const expectedDelta = collection in IMPORT_TARGETS ? expected?.[IMPORT_TARGETS[collection]] : 0
    if (first[collection].rows - before[collection].rows !== expectedDelta) {
      addBlocker(blockers, 'FIRST_RUN_INVENTORY_DELTA_MISMATCH', { collection, expected: expectedDelta ?? null })
    }
    if (rerun[collection].rows !== first[collection].rows) {
      addBlocker(blockers, 'RERUN_ROW_COUNT_CHANGED', { collection })
    }
    if (rerun[collection].sha256 !== first[collection].sha256) {
      addBlocker(blockers, 'RERUN_CONTENT_HASH_CHANGED', { collection })
    }
    if (NON_TARGETS.includes(collection)) {
      if (first[collection].rows !== before[collection].rows) addBlocker(blockers, 'NON_TARGET_ROW_COUNT_CHANGED', { collection })
      if (first[collection].sha256 !== before[collection].sha256) addBlocker(blockers, 'NON_TARGET_CONTENT_HASH_CHANGED', { collection })
    }
  }
}

const checkRejectedLedger = (manifestPath, ledger, expected, blockers) => {
  if (!ledger || typeof ledger !== 'object') {
    addBlocker(blockers, 'REJECTED_LEDGER_MISSING')
    return
  }
  if (!isNonNegativeInteger(ledger.rows)) addBlocker(blockers, 'REJECTED_LEDGER_ROWS_INVALID')
  if (!Number.isInteger(ledger.bytes) || ledger.bytes < 0) addBlocker(blockers, 'REJECTED_LEDGER_BYTES_INVALID')
  if (!SHA256.test(textValue(ledger.sha256))) addBlocker(blockers, 'REJECTED_LEDGER_SHA256_INVALID')
  const required = {
    ratings: expected?.rejected_ratings,
    rating_scores: expected?.rejected_scores,
    bonus_attribute_rating_mapping: expected?.rejected_bonus_selections,
    cellar: expected?.rejected_cellar_rows
  }
  for (const [collection, count] of Object.entries(required)) {
    if (ledger.counts?.[collection] !== count) {
      addBlocker(blockers, 'REJECTED_LEDGER_COUNT_MISMATCH', { collection, expected: count ?? null })
    }
  }

  try {
    const evidence = readCsvEvidence(manifestPath, ledger.file)
    if (evidence.records.length !== ledger.rows) addBlocker(blockers, 'REJECTED_LEDGER_ROW_COUNT_MISMATCH')
    if (evidence.bytes !== ledger.bytes) addBlocker(blockers, 'REJECTED_LEDGER_BYTES_MISMATCH')
    if (evidence.sha256 !== ledger.sha256) addBlocker(blockers, 'REJECTED_LEDGER_SHA256_MISMATCH')

    const requiredHeaders = [
      'Collection',
      'Source record key',
      'Source count',
      'Rejection reason',
      'Evidence reference'
    ]
    for (const field of requiredHeaders) {
      if (!evidence.headers.includes(field)) addBlocker(blockers, 'REJECTED_LEDGER_COLUMN_MISSING', { field })
    }

    const computed = Object.fromEntries(Object.keys(required).map((collection) => [collection, 0]))
    const keys = new Set()
    for (const record of evidence.records) {
      const collection = textValue(record.Collection)
      const sourceKey = textValue(record['Source record key'])
      const sourceCount = textValue(record['Source count'])
      const compoundKey = `${collection}\u0000${sourceKey}`
      if (!Object.hasOwn(computed, collection)) {
        addBlocker(blockers, 'REJECTED_LEDGER_COLLECTION_INVALID', { row: record.__row })
      } else if (!/^[1-9]\d*$/.test(sourceCount)) {
        addBlocker(blockers, 'REJECTED_LEDGER_SOURCE_COUNT_INVALID', { collection, row: record.__row })
      } else {
        computed[collection] += Number(sourceCount)
      }
      if (!sourceKey) addBlocker(blockers, 'REJECTED_LEDGER_SOURCE_KEY_MISSING', { collection, row: record.__row })
      else if (keys.has(compoundKey)) addBlocker(blockers, 'REJECTED_LEDGER_SOURCE_KEY_DUPLICATE', { collection, row: record.__row })
      else keys.add(compoundKey)
      if (!textValue(record['Rejection reason'])) addBlocker(blockers, 'REJECTED_LEDGER_REASON_MISSING', { collection, row: record.__row })
      if (!textValue(record['Evidence reference'])) addBlocker(blockers, 'REJECTED_LEDGER_EVIDENCE_MISSING', { collection, row: record.__row })
    }
    for (const [collection, count] of Object.entries(required)) {
      if (computed[collection] !== count) {
        addBlocker(blockers, 'REJECTED_LEDGER_COMPUTED_COUNT_MISMATCH', { collection, expected: count ?? null })
      }
    }
  } catch {
    addBlocker(blockers, 'REJECTED_LEDGER_READ_FAILED')
  }
}

const valueSet = (records, field) => new Set(records.map((record) => textValue(record[field])).filter(Boolean))

const orphanCount = (records, field, parentValues, { nullable = false } = {}) => records.reduce((count, record) => {
  const value = textValue(record[field])
  if (!value && nullable) return count
  return count + (value && parentValues.has(value) ? 0 : 1)
}, 0)

const duplicateCount = (records, fields) => {
  const seen = new Set()
  let blockers = 0
  for (const record of records) {
    const values = fields.map((field) => textValue(record[field]))
    if (values.some((value) => !value)) {
      blockers += 1
      continue
    }
    const key = JSON.stringify(values)
    if (seen.has(key)) blockers += 1
    else seen.add(key)
  }
  return blockers
}

const computeSnapshotChecks = (manifestPath, run, runName, blockers) => {
  const collections = {}
  try {
    for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
      collections[collection] = readCsvEvidence(manifestPath, run.collections[collection].file)
    }
  } catch {
    return
  }

  const records = Object.fromEntries(Object.entries(collections).map(([collection, evidence]) => [
    collection,
    evidence.records
  ]))
  const ids = {
    products: valueSet(records.products, 'id'),
    producers: valueSet(records.producers, 'id'),
    categories: valueSet(records.categories, 'id'),
    ratings: valueSet(records.ratings, 'id'),
    rating_attributes: valueSet(records.rating_attributes, 'id'),
    bonus_attributes: valueSet(records.bonus_attributes, 'id'),
    profiles: valueSet(records.profiles, 'user_id')
  }
  const productCategoryField = collections.products.headers.includes('product_category_id')
    ? 'product_category_id'
    : 'category_id'
  const actualOrphans = {
    products_without_producer: orphanCount(records.products, 'producer_id', ids.producers),
    products_without_category: orphanCount(records.products, productCategoryField, ids.categories, { nullable: true }),
    ratings_without_product: orphanCount(records.ratings, 'product_id', ids.products),
    ratings_without_profile: orphanCount(records.ratings, 'user_id', ids.profiles),
    scores_without_rating: orphanCount(records.rating_scores, 'rating_id', ids.ratings),
    scores_without_attribute: orphanCount(records.rating_scores, 'attribute_id', ids.rating_attributes),
    bonus_mappings_without_rating: orphanCount(records.bonus_attribute_rating_mapping, 'rating_id', ids.ratings),
    bonus_mappings_without_attribute: orphanCount(records.bonus_attribute_rating_mapping, 'bonus_attributes_id', ids.bonus_attributes),
    cellar_without_product: orphanCount(records.cellar, 'product_id', ids.products),
    cellar_without_profile: orphanCount(records.cellar, 'user_id', ids.profiles)
  }
  const actualDuplicates = {
    ratings_owner_rating_id: duplicateCount(records.ratings, ['user_id', 'rating_id']),
    ratings_submission_key: duplicateCount(records.ratings, ['submission_key']),
    rating_scores_parent_attribute: duplicateCount(records.rating_scores, ['rating_id', 'attribute_id']),
    rating_scores_uniqueness_key: duplicateCount(records.rating_scores, ['uniqueness_key']),
    bonus_mappings_parent_attribute: duplicateCount(records.bonus_attribute_rating_mapping, ['rating_id', 'bonus_attributes_id']),
    bonus_mappings_uniqueness_key: duplicateCount(records.bonus_attribute_rating_mapping, ['uniqueness_key']),
    cellar_destination_id: duplicateCount(records.cellar, ['id'])
  }

  for (const [kind, actual] of [['orphan_checks', actualOrphans], ['duplicate_checks', actualDuplicates]]) {
    for (const [field, count] of Object.entries(actual)) {
      if (count !== 0) addBlocker(blockers, 'RUN_COMPUTED_CHECK_NON_ZERO', { run: runName, kind, field, count })
      if (run[kind]?.[field] !== count) {
        addBlocker(blockers, 'RUN_CHECK_EVIDENCE_MISMATCH', {
          run: runName,
          kind,
          field,
          declared: run[kind]?.[field] ?? null,
          computed: count
        })
      }
    }
  }
}

export const auditImportRehearsal = (manifest, manifestPath) => {
  const blockers = []
  checkReviewMetadata(manifest, blockers)
  checkExpectedCounts(manifest.expected, blockers)
  checkRejectedLedger(manifestPath, manifest.rejected_ledger, manifest.expected, blockers)

  const inventories = {
    before: readRun(manifestPath, manifest.runs?.before, 'before', blockers),
    first: readRun(manifestPath, manifest.runs?.first, 'first', blockers),
    rerun: readRun(manifestPath, manifest.runs?.rerun, 'rerun', blockers)
  }

  checkMutationMap(manifest.runs?.first, 'first', manifest.expected, blockers)
  checkMutationMap(manifest.runs?.rerun, 'rerun', manifest.expected, blockers)
  for (const runName of ['first', 'rerun']) {
    checkAggregateZeroes(manifest.runs?.[runName]?.orphan_checks, ORPHAN_CHECKS, runName, 'orphan_checks', blockers)
    checkAggregateZeroes(manifest.runs?.[runName]?.duplicate_checks, DUPLICATE_CHECKS, runName, 'duplicate_checks', blockers)
    if (manifest.runs?.[runName]?.collections) {
      computeSnapshotChecks(manifestPath, manifest.runs[runName], runName, blockers)
    }
  }
  checkInventories(inventories.before, inventories.first, inventories.rerun, manifest.expected, blockers)

  return {
    planId: IMPORT_REHEARSAL_PLAN_ID,
    certificationScope: 'historical-import-rehearsal-and-idempotency',
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: {
      collectionsPerRun: IMPORT_REHEARSAL_COLLECTIONS.length,
      verifiedRunCollections: Object.values(inventories).reduce((count, run) => count + Object.keys(run || {}).length, 0),
      blockers: blockers.length
    },
    countsByCode: countByCode(blockers),
    blockers,
    inventories
  }
}

const parseArguments = (arguments_) => {
  const options = {}
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    if (!['--manifest', '--output'].includes(key) || !value || options[key.slice(2)]) {
      throw new Error('Use --manifest <path> with optional --output <path>.')
    }
    options[key.slice(2)] = value
  }
  if (!options.manifest) throw new Error('--manifest is required.')
  return options
}

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const manifestPath = path.resolve(options.manifest)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const report = auditImportRehearsal(manifest, manifestPath)
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
    process.exitCode = 1
  }
}