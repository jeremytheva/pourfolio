export const ACCOUNT_DELETION_PLAN_FORMAT = 'pourfolio.account-deletion-plan'
export const ACCOUNT_DELETION_PLAN_SCHEMA_VERSION = '1.0.0'

export const ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS = Object.freeze([
  'profiles',
  'ratings',
  'rating_scores',
  'bonus_attribute_rating_mapping',
  'cellar'
])

export const ACCOUNT_DELETION_PLAN_COLLECTION_ORDER = Object.freeze([
  'bonus_attribute_rating_mapping',
  'rating_scores',
  'ratings',
  'cellar',
  'profiles'
])

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const scalarId = (value, label) => {
  if (!['string', 'number', 'bigint'].includes(typeof value) ||
      (typeof value === 'number' && !Number.isFinite(value))) {
    throw new Error(`${label} is invalid.`)
  }
  const text = String(value)
  if (!text.trim()) throw new Error(`${label} is missing.`)
  return text
}

const optionalId = (value, label) => {
  if (value === undefined || value === null || value === '') return null
  return scalarId(value, label)
}

const isoDateTime = (value, label) => {
  if (typeof value !== 'string' || !value) throw new Error(`${label} is invalid.`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid.`)
  return date.toISOString()
}

const validateSnapshot = (snapshot) => {
  if (!isPlainObject(snapshot)) throw new Error('Account deletion snapshot is invalid.')

  return Object.fromEntries(ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS.map((collection) => {
    const records = snapshot[collection]
    if (!Array.isArray(records)) {
      throw new Error(`Account deletion snapshot collection ${collection} is missing or invalid.`)
    }

    const identifiers = new Set()
    const validated = records.map((record) => {
      if (!isPlainObject(record)) {
        throw new Error(`Account deletion snapshot collection ${collection} contains an invalid record.`)
      }
      const id = scalarId(record.id, `${collection} record identifier`)
      const ownerId = scalarId(record.user_id, `${collection} record owner identifier`)
      if (identifiers.has(id)) {
        throw new Error(`${collection} contains a duplicate record identifier.`)
      }
      identifiers.add(id)
      return { id, ownerId, record }
    })

    return [collection, validated]
  }))
}

const exactOwnerRecords = (validated, ownerId) => Object.fromEntries(
  ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS.map((collection) => [
    collection,
    validated[collection].filter((entry) => entry.ownerId === ownerId)
  ])
)

const assertRelationships = (owned) => {
  if (owned.profiles.length > 1) {
    throw new Error('Account deletion snapshot contains multiple owned profiles.')
  }

  const ratingsById = new Map(owned.ratings.map((entry) => [entry.id, entry]))
  const cellarById = new Map(owned.cellar.map((entry) => [entry.id, entry]))

  for (const child of owned.rating_scores) {
    const parentId = scalarId(child.record.rating_id, 'Rating score parent identifier')
    if (!ratingsById.has(parentId)) {
      throw new Error('Owned rating score references an unavailable owner rating.')
    }
  }

  for (const child of owned.bonus_attribute_rating_mapping) {
    const parentId = scalarId(child.record.rating_id, 'Bonus mapping parent identifier')
    if (!ratingsById.has(parentId)) {
      throw new Error('Owned bonus mapping references an unavailable owner rating.')
    }
  }

  for (const rating of owned.ratings) {
    const cellarId = optionalId(rating.record.cellar_id, 'Rating cellar identifier')
    if (!cellarId) continue
    const cellar = cellarById.get(cellarId)
    if (!cellar) {
      throw new Error('Owned rating references an unavailable owner cellar record.')
    }
    const ratingProductId = scalarId(rating.record.product_id, 'Rating product identifier')
    const cellarProductId = scalarId(cellar.record.product_id, 'Cellar product identifier')
    if (ratingProductId !== cellarProductId) {
      throw new Error('Owned rating and cellar record reference different products.')
    }
  }
}

const buildSteps = (owned) => Object.freeze(
  ACCOUNT_DELETION_PLAN_COLLECTION_ORDER.map((collection, index) => {
    const recordIds = Object.freeze(owned[collection].map(({ id }) => id).sort())
    return Object.freeze({
      sequence: index + 1,
      collection,
      count: recordIds.length,
      record_ids: recordIds
    })
  })
)

export const buildAccountDeletionPlan = ({
  account,
  snapshot,
  generatedAt = new Date().toISOString()
}) => {
  if (!isPlainObject(account)) throw new Error('Authenticated account identity is invalid.')
  const ownerId = scalarId(account.id, 'Authenticated account identifier')
  const generated_at = isoDateTime(generatedAt, 'Account deletion plan generation time')
  const owned = exactOwnerRecords(validateSnapshot(snapshot), ownerId)
  assertRelationships(owned)

  const steps = buildSteps(owned)
  const recordCounts = Object.freeze(Object.fromEntries(
    steps.map(({ collection, count }) => [collection, count])
  ))

  return Object.freeze({
    format: ACCOUNT_DELETION_PLAN_FORMAT,
    schema_version: ACCOUNT_DELETION_PLAN_SCHEMA_VERSION,
    generated_at,
    total_records: steps.reduce((total, { count }) => total + count, 0),
    record_counts: recordCounts,
    steps
  })
}
