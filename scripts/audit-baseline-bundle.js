import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { auditSchemaContract } from './audit-schema-contract.js'
import {
  countByCode,
  fingerprintBuffer,
  FULL_COMMIT_SHA,
  isNonNegativeInteger,
  isUtcTimestamp,
  readCsvEvidence,
  resolveEvidenceFile,
  SHA256,
  textValue
} from './audit-evidence-utils.js'

export const BASELINE_BUNDLE_PLAN_ID = 'PF-P1-BASELINE-BUNDLE-V1'

export const BASELINE_COLLECTIONS = [
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

const REQUIRED_ARTIFACTS = ['schema', ...BASELINE_COLLECTIONS]

const REQUIRED_HEADERS = {
  products: ['id', 'producer_id'],
  producers: ['id'],
  categories: ['id'],
  ratings: ['id', 'product_id', 'user_id'],
  rating_scores: ['id', 'rating_id', 'attribute_id'],
  rating_attributes: ['id'],
  bonus_attributes: ['id'],
  bonus_attribute_rating_mapping: ['id', 'rating_id', 'bonus_attributes_id'],
  profiles: ['user_id'],
  cellar: ['id', 'product_id', 'user_id']
}

const addBlocker = (blockers, code, details = {}) => blockers.push({ code, ...details })

const requireText = (manifest, field, blockers) => {
  if (!textValue(manifest[field])) addBlocker(blockers, 'MANIFEST_FIELD_MISSING', { field })
}

const validateMetadata = (manifest, blockers) => {
  if (manifest.plan_id !== BASELINE_BUNDLE_PLAN_ID) {
    addBlocker(blockers, 'PLAN_ID_INVALID', { expected: BASELINE_BUNDLE_PLAN_ID })
  }
  for (const field of ['environment', 'deployment_id', 'snapshot_id', 'evidence_reference', 'operator', 'reviewer']) {
    requireText(manifest, field, blockers)
  }
  if (manifest.review_decision !== 'approved') addBlocker(blockers, 'REVIEW_DECISION_INVALID')
  if (!FULL_COMMIT_SHA.test(textValue(manifest.release_sha))) {
    addBlocker(blockers, 'RELEASE_SHA_INVALID')
  }
  if (!['quiesced', 'provider-consistent'].includes(manifest.consistency_control)) {
    addBlocker(blockers, 'CONSISTENCY_CONTROL_INVALID')
  }
  for (const field of ['export_started_at', 'export_completed_at', 'reviewed_at']) {
    if (!isUtcTimestamp(manifest[field])) addBlocker(blockers, 'UTC_TIMESTAMP_INVALID', { field })
  }
  if (
    isUtcTimestamp(manifest.export_started_at) &&
    isUtcTimestamp(manifest.export_completed_at) &&
    Date.parse(manifest.export_started_at) > Date.parse(manifest.export_completed_at)
  ) {
    addBlocker(blockers, 'EXPORT_INTERVAL_INVALID')
  }
  if (
    textValue(manifest.operator) &&
    textValue(manifest.operator).toLowerCase() === textValue(manifest.reviewer).toLowerCase()
  ) {
    addBlocker(blockers, 'REVIEWER_NOT_INDEPENDENT')
  }
}

const validateArtifactRecord = (artifact, snapshotId, blockers) => {
  const collection = textValue(artifact?.collection)
  if (textValue(artifact?.snapshot_id) !== snapshotId) {
    addBlocker(blockers, 'ARTIFACT_SNAPSHOT_MISMATCH', { collection })
  }
  if (!Number.isInteger(artifact?.bytes) || artifact.bytes < 0) {
    addBlocker(blockers, 'ARTIFACT_BYTES_INVALID', { collection })
  }
  if (!SHA256.test(textValue(artifact?.sha256))) {
    addBlocker(blockers, 'ARTIFACT_SHA256_INVALID', { collection })
  }
  if (collection === 'schema') {
    if (artifact.rows !== null) addBlocker(blockers, 'SCHEMA_ROWS_MUST_BE_NULL', { collection })
  } else if (!isNonNegativeInteger(artifact?.rows)) {
    addBlocker(blockers, 'ARTIFACT_ROWS_INVALID', { collection })
  }
}

const indexArtifacts = (manifest, blockers) => {
  if (!Array.isArray(manifest.artifacts)) {
    addBlocker(blockers, 'ARTIFACTS_MISSING')
    return new Map()
  }
  const artifacts = new Map()
  for (const artifact of manifest.artifacts) {
    const collection = textValue(artifact?.collection)
    if (!REQUIRED_ARTIFACTS.includes(collection)) {
      addBlocker(blockers, 'ARTIFACT_COLLECTION_UNKNOWN', { collection: collection || null })
      continue
    }
    if (artifacts.has(collection)) {
      addBlocker(blockers, 'ARTIFACT_COLLECTION_DUPLICATE', { collection })
      continue
    }
    artifacts.set(collection, artifact)
    validateArtifactRecord(artifact, textValue(manifest.snapshot_id), blockers)
  }
  for (const collection of REQUIRED_ARTIFACTS) {
    if (!artifacts.has(collection)) addBlocker(blockers, 'ARTIFACT_COLLECTION_MISSING', { collection })
  }
  return artifacts
}

const validatePages = (manifest, artifacts, blockers) => {
  const pages = Array.isArray(manifest.pages) ? manifest.pages : []
  if (!Array.isArray(manifest.pages)) addBlocker(blockers, 'PAGINATION_LEDGER_MISSING')

  for (const collection of BASELINE_COLLECTIONS) {
    const collectionPages = pages.filter((page) => textValue(page?.collection) === collection)
    if (!collectionPages.length) {
      addBlocker(blockers, 'PAGINATION_COLLECTION_MISSING', { collection })
      continue
    }
    collectionPages.sort((left, right) => left.sequence - right.sequence)
    let rowTotal = 0
    let terminalCount = 0
    for (let index = 0; index < collectionPages.length; index += 1) {
      const page = collectionPages[index]
      if (page.sequence !== index + 1 || page.page !== index + 1) {
        addBlocker(blockers, 'PAGINATION_SEQUENCE_INVALID', { collection, sequence: page.sequence ?? null })
      }
      if (!isNonNegativeInteger(page.rows)) {
        addBlocker(blockers, 'PAGINATION_ROWS_INVALID', { collection, sequence: page.sequence ?? null })
      } else {
        rowTotal += page.rows
      }
      if (textValue(page.snapshot_id) !== textValue(manifest.snapshot_id)) {
        addBlocker(blockers, 'PAGINATION_SNAPSHOT_MISMATCH', { collection, sequence: page.sequence ?? null })
      }
      if (page.status !== 'success') {
        addBlocker(blockers, 'PAGINATION_STATUS_INVALID', { collection, sequence: page.sequence ?? null })
      }
      if (!textValue(page.evidence_reference)) {
        addBlocker(blockers, 'PAGINATION_EVIDENCE_MISSING', { collection, sequence: page.sequence ?? null })
      }
      if (page.terminal === true) terminalCount += 1
      if (page.terminal === true && index !== collectionPages.length - 1) {
        addBlocker(blockers, 'PAGINATION_TERMINAL_NOT_LAST', { collection, sequence: page.sequence ?? null })
      }
    }
    if (terminalCount !== 1 || collectionPages.at(-1)?.terminal !== true) {
      addBlocker(blockers, 'PAGINATION_TERMINAL_INVALID', { collection, terminalPages: terminalCount })
    }
    if (artifacts.get(collection)?.rows !== rowTotal) {
      addBlocker(blockers, 'PAGINATION_ROW_TOTAL_MISMATCH', {
        collection,
        manifestRows: artifacts.get(collection)?.rows ?? null,
        pageRows: rowTotal
      })
    }
  }

  for (const page of pages) {
    const collection = textValue(page?.collection)
    if (!BASELINE_COLLECTIONS.includes(collection)) {
      addBlocker(blockers, 'PAGINATION_COLLECTION_UNKNOWN', { collection: collection || null })
    }
  }
}

const indexValues = (records, field) => new Set(records.map((record) => textValue(record[field])).filter(Boolean))

const countInvalidPrimaryKeys = (records, field) => {
  const seen = new Set()
  let missing = 0
  let duplicate = 0
  for (const record of records) {
    const value = textValue(record[field])
    if (!value) missing += 1
    else if (seen.has(value)) duplicate += 1
    else seen.add(value)
  }
  return { missing, duplicate }
}

const countOrphans = (records, field, parentIds, { nullable = false } = {}) => records.reduce((count, record) => {
  const value = textValue(record[field])
  if (!value && nullable) return count
  return count + (value && parentIds.has(value) ? 0 : 1)
}, 0)

const validateRelationships = (collections, blockers) => {
  for (const [collection, required] of Object.entries(REQUIRED_HEADERS)) {
    const headers = new Set(collections[collection].headers)
    for (const field of required) {
      if (!headers.has(field)) addBlocker(blockers, 'CSV_REQUIRED_COLUMN_MISSING', { collection, field })
    }
    if (collection === 'products' && !headers.has('product_category_id') && !headers.has('category_id')) {
      addBlocker(blockers, 'CSV_REQUIRED_COLUMN_MISSING', { collection, field: 'product_category_id|category_id' })
    }
  }

  const primaryFields = Object.fromEntries(BASELINE_COLLECTIONS.map((collection) => [
    collection,
    collection === 'profiles' ? 'user_id' : 'id'
  ]))
  for (const [collection, field] of Object.entries(primaryFields)) {
    const counts = countInvalidPrimaryKeys(collections[collection].records, field)
    if (counts.missing) addBlocker(blockers, 'PRIMARY_KEY_MISSING', { collection, count: counts.missing })
    if (counts.duplicate) addBlocker(blockers, 'PRIMARY_KEY_DUPLICATE', { collection, count: counts.duplicate })
  }

  const ids = Object.fromEntries(Object.entries(primaryFields).map(([collection, field]) => [
    collection,
    indexValues(collections[collection].records, field)
  ]))
  const productCategoryField = collections.products.headers.includes('product_category_id')
    ? 'product_category_id'
    : 'category_id'
  const checks = [
    ['PRODUCT_PRODUCER_ORPHAN', 'products', 'producer_id', ids.producers, false],
    ['PRODUCT_CATEGORY_ORPHAN', 'products', productCategoryField, ids.categories, true],
    ['RATING_PRODUCT_ORPHAN', 'ratings', 'product_id', ids.products, false],
    ['RATING_PROFILE_ORPHAN', 'ratings', 'user_id', ids.profiles, false],
    ['SCORE_RATING_ORPHAN', 'rating_scores', 'rating_id', ids.ratings, false],
    ['SCORE_ATTRIBUTE_ORPHAN', 'rating_scores', 'attribute_id', ids.rating_attributes, false],
    ['BONUS_RATING_ORPHAN', 'bonus_attribute_rating_mapping', 'rating_id', ids.ratings, false],
    ['BONUS_ATTRIBUTE_ORPHAN', 'bonus_attribute_rating_mapping', 'bonus_attributes_id', ids.bonus_attributes, false],
    ['CELLAR_PRODUCT_ORPHAN', 'cellar', 'product_id', ids.products, false],
    ['CELLAR_PROFILE_ORPHAN', 'cellar', 'user_id', ids.profiles, false]
  ]
  for (const [code, collection, field, parentIds, nullable] of checks) {
    const count = countOrphans(collections[collection].records, field, parentIds, { nullable })
    if (count) addBlocker(blockers, code, { collection, count })
  }
}

export const auditBaselineBundle = (manifest, manifestPath) => {
  const blockers = []
  validateMetadata(manifest, blockers)
  const artifacts = indexArtifacts(manifest, blockers)
  validatePages(manifest, artifacts, blockers)
  const verifiedArtifacts = {}
  const collections = {}

  for (const [collection, artifact] of artifacts) {
    try {
      if (collection === 'schema') {
        const resolved = resolveEvidenceFile(manifestPath, artifact.file)
        const buffer = fs.readFileSync(resolved)
        const fingerprint = fingerprintBuffer(buffer)
        verifiedArtifacts.schema = { file: path.basename(resolved), ...fingerprint }
        if (fingerprint.bytes !== artifact.bytes) addBlocker(blockers, 'ARTIFACT_BYTES_MISMATCH', { collection })
        if (fingerprint.sha256 !== artifact.sha256) addBlocker(blockers, 'ARTIFACT_SHA256_MISMATCH', { collection })
        const schemaAudit = auditSchemaContract(buffer.toString('utf8'))
        if (schemaAudit.status !== 'PASS') {
          addBlocker(blockers, 'SCHEMA_CONTRACT_BLOCKED', { count: schemaAudit.blockers.length })
        }
      } else {
        const evidence = readCsvEvidence(manifestPath, artifact.file)
        collections[collection] = evidence
        verifiedArtifacts[collection] = {
          file: path.basename(evidence.file),
          rows: evidence.records.length,
          bytes: evidence.bytes,
          sha256: evidence.sha256
        }
        if (evidence.records.length !== artifact.rows) addBlocker(blockers, 'ARTIFACT_ROW_COUNT_MISMATCH', { collection })
        if (evidence.bytes !== artifact.bytes) addBlocker(blockers, 'ARTIFACT_BYTES_MISMATCH', { collection })
        if (evidence.sha256 !== artifact.sha256) addBlocker(blockers, 'ARTIFACT_SHA256_MISMATCH', { collection })
      }
    } catch {
      addBlocker(blockers, 'ARTIFACT_READ_FAILED', { collection })
    }
  }

  if (BASELINE_COLLECTIONS.every((collection) => collections[collection])) {
    validateRelationships(collections, blockers)
  }

  return {
    planId: BASELINE_BUNDLE_PLAN_ID,
    certificationScope: 'same-state-baseline-bundle',
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: {
      requiredArtifacts: REQUIRED_ARTIFACTS.length,
      verifiedArtifacts: Object.keys(verifiedArtifacts).length,
      paginationRows: Array.isArray(manifest.pages) ? manifest.pages.length : 0,
      blockers: blockers.length
    },
    countsByCode: countByCode(blockers),
    blockers,
    artifacts: verifiedArtifacts
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
  const report = auditBaselineBundle(manifest, manifestPath)
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