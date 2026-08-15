import { SCORE_RANGE } from '../../src/data/contract.js'

export const ACCOUNT_EXPORT_FORMAT = 'pourfolio.account-export'
export const ACCOUNT_EXPORT_SCHEMA_VERSION = '1.0.0'

export const ACCOUNT_EXPORT_COLLECTIONS = Object.freeze([
  'profiles',
  'ratings',
  'rating_scores',
  'bonus_attribute_rating_mapping',
  'cellar',
  'products',
  'producers',
  'categories',
  'rating_attributes',
  'bonus_attributes'
])

export const ACCOUNT_EXPORT_COLLECTION_DESCRIPTIONS = Object.freeze({
  profiles: 'The account owner\'s editable Pourfolio profile fields.',
  ratings: 'The account owner\'s rating headers, lifecycle state and calculated totals.',
  rating_scores: 'The account owner\'s per-attribute scores linked to rating records.',
  bonus_attribute_rating_mapping: 'The account owner\'s selected bonus attributes linked to rating records.',
  cellar: 'The account owner\'s private cellar inventory.',
  products: 'Minimum shared product context referenced by the owner\'s ratings or cellar.',
  producers: 'Minimum shared producer context referenced by exported products.',
  categories: 'Minimum shared category context referenced by exported products or rating attributes.',
  rating_attributes: 'Minimum shared score-definition context referenced by exported rating scores.',
  bonus_attributes: 'Minimum shared bonus-definition context referenced by exported bonus selections.'
})

const RATING_STATES = new Set(['pending', 'complete', 'failed', 'deleting', 'deleted'])

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const scalarText = (value, label) => {
  if (!['string', 'number', 'bigint'].includes(typeof value) ||
      (typeof value === 'number' && !Number.isFinite(value))) {
    throw new Error(`${label} is invalid.`)
  }
  return String(value)
}

const compareIds = (left, right) => {
  const leftId = String(left.id)
  const rightId = String(right.id)
  if (leftId < rightId) return -1
  if (leftId > rightId) return 1
  return 0
}

const requiredId = (value, label) => {
  const text = value === undefined || value === null ? '' : scalarText(value, label).trim()
  if (!text) {
    throw new Error(`${label} is missing.`)
  }
  return text
}

const optionalId = (value) => {
  if (value === undefined || value === null) return null
  const text = scalarText(value, 'An optional relationship identifier').trim()
  return text || null
}

const optionalText = (value) => {
  if (value === undefined || value === null) return null
  if (!['string', 'number', 'boolean'].includes(typeof value) ||
      (typeof value === 'number' && !Number.isFinite(value))) {
    throw new Error('A text export field is invalid.')
  }
  return String(value)
}

const optionalNumber = (value, label) => {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null
  if (!['string', 'number'].includes(typeof value)) throw new Error(`${label} is invalid.`)
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`${label} is invalid.`)
  return number
}

const optionalBoolean = (value) => {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null
  const normalised = typeof value === 'string' ? value.trim() : value
  if (normalised === true || normalised === false) return normalised
  if (normalised === 1 || normalised === '1') return true
  if (normalised === 0 || normalised === '0') return false
  throw new Error('A boolean export field is invalid.')
}

const isoDateTime = (value, label, { required = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${label} is missing.`)
    return null
  }
  if (typeof value !== 'string') throw new Error(`${label} is invalid.`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid.`)
  return date.toISOString()
}

const isoDate = (value, label) => {
  if (value === undefined || value === null || value === '') return null
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00.000Z`)
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text) return text
    throw new Error(`${label} is invalid.`)
  }
  return isoDateTime(value, label)
}

const validateSnapshot = (snapshot) => {
  if (!isPlainObject(snapshot)) throw new Error('Account export snapshot is invalid.')

  for (const collection of ACCOUNT_EXPORT_COLLECTIONS) {
    if (!Object.hasOwn(snapshot, collection) || !Array.isArray(snapshot[collection])) {
      throw new Error(`Account export snapshot collection ${collection} is missing or invalid.`)
    }
    if (snapshot[collection].some((record) => !isPlainObject(record))) {
      throw new Error(`Account export snapshot collection ${collection} contains an invalid record.`)
    }
  }
}

const indexCollection = (records, label) => {
  const index = new Map()
  for (const record of records) {
    const id = requiredId(record.id, `${label} record identifier`)
    if (index.has(id)) throw new Error(`${label} contains duplicate record identifier ${id}.`)
    index.set(id, record)
  }
  return index
}

const exactOwnerRecords = (records, ownerId) => records.filter((record) => (
  ['string', 'number', 'bigint'].includes(typeof record.user_id) &&
  String(record.user_id) === ownerId
))

const selectedRecords = (index, ids, label) => [...ids]
  .map((id) => {
    const record = index.get(id)
    if (!record) throw new Error(`${label} record ${id} is missing from the export snapshot.`)
    return record
  })

const idSet = (records, field) => new Set(records
  .map((record) => optionalId(record[field]))
  .filter(Boolean))

const projectProfile = (record) => ({
  id: requiredId(record.id, 'Profile identifier'),
  name: optionalText(record.name),
  description: optionalText(record.description),
  avatar_url: optionalText(record.avatar_url)
})

const projectRating = (record) => {
  const state = optionalText(record.submission_state)
  if (!RATING_STATES.has(state)) throw new Error('Rating submission state is invalid.')

  const ratingId = optionalNumber(record.rating_id, 'Rating submission identifier')
  if (!Number.isSafeInteger(ratingId) || ratingId <= 0) {
    throw new Error('Rating submission identifier is invalid.')
  }

  return {
    id: requiredId(record.id, 'Rating identifier'),
    rating_id: ratingId,
    product_id: requiredId(record.product_id, 'Rating product identifier'),
    cellar_id: optionalId(record.cellar_id),
    date_rated: isoDateTime(record.date_rated, 'Rating date', { required: true }),
    total_unweighted: optionalNumber(record.total_unweighted, 'Rating unweighted total'),
    total_weighted: optionalNumber(record.total_weighted, 'Rating weighted total'),
    submission_state: state,
    deleted_at: isoDateTime(record.deleted_at, 'Rating deletion date')
  }
}

const projectRatingScore = (record) => {
  const score = optionalNumber(record.attribute_score, 'Rating attribute score')
  if (!Number.isInteger(score) || score < SCORE_RANGE.min || score > SCORE_RANGE.max) {
    throw new Error('Rating attribute score is invalid.')
  }

  return {
    id: requiredId(record.id, 'Rating score identifier'),
    rating_id: requiredId(record.rating_id, 'Rating score parent identifier'),
    attribute_id: requiredId(record.attribute_id, 'Rating attribute identifier'),
    attribute_score: score
  }
}

const projectBonusMapping = (record) => ({
  id: requiredId(record.id, 'Bonus mapping identifier'),
  rating_id: requiredId(record.rating_id, 'Bonus mapping parent identifier'),
  bonus_attributes_id: requiredId(record.bonus_attributes_id, 'Bonus attribute identifier')
})

const projectCellar = (record) => ({
  id: requiredId(record.id, 'Cellar identifier'),
  product_id: requiredId(record.product_id, 'Cellar product identifier'),
  location_id: optionalId(record.location_id),
  quantity: optionalNumber(record.quantity, 'Cellar quantity'),
  mls: optionalNumber(record.mls, 'Cellar volume'),
  container: optionalText(record.container),
  purchase_price: optionalNumber(record.purchase_price, 'Cellar purchase price'),
  retail_price: optionalNumber(record.retail_price, 'Cellar retail price'),
  date_received: isoDate(record.date_received, 'Cellar received date'),
  sharing_series_id: optionalId(record.sharing_series_id),
  series_version_id: optionalId(record.series_version_id),
  purchase_location_id: optionalId(record.purchase_location_id),
  purchased_by_id: optionalId(record.purchased_by_id),
  gift: optionalBoolean(record.gift),
  gift_from: optionalText(record.gift_from),
  bet_id: optionalId(record.bet_id),
  notes: optionalText(record.notes)
})

const projectProduct = (record) => ({
  id: requiredId(record.id, 'Product identifier'),
  product_name: optionalText(record.product_name),
  product_category_id: optionalId(record.product_category_id),
  producer_id: optionalId(record.producer_id),
  abv: optionalNumber(record.abv, 'Product alcohol percentage'),
  ibu: optionalNumber(record.ibu, 'Product bitterness'),
  declared_category: optionalText(record.declared_category),
  edition: optionalText(record.edition),
  collaboration: optionalText(record.collaboration)
})

const projectProducer = (record) => ({
  id: requiredId(record.id, 'Producer identifier'),
  producer_name: optionalText(record.producer_name)
})

const projectCategory = (record) => ({
  id: requiredId(record.id, 'Category identifier'),
  category_name: optionalText(record.category_name)
})

const projectRatingAttribute = (record) => ({
  id: requiredId(record.id, 'Rating attribute identifier'),
  category_id: optionalId(record.category_id),
  attribute_name: optionalText(record.attribute_name),
  is_scored: optionalBoolean(record.is_scored),
  weighting: optionalNumber(record.weighting, 'Rating attribute weighting')
})

const projectBonusAttribute = (record) => ({
  id: requiredId(record.id, 'Bonus attribute identifier'),
  description: optionalText(record.description),
  point_value: optionalNumber(record.point_value, 'Bonus attribute point value')
})

const projectSorted = (records, projector) => records.map(projector).sort(compareIds)

const assertRatingRelationships = (ratings, scores, bonusMappings, cellar) => {
  const ratingsById = new Map(ratings.map((rating) => [requiredId(rating.id, 'Rating identifier'), rating]))
  const cellarById = new Map(cellar.map((record) => [requiredId(record.id, 'Cellar identifier'), record]))

  for (const child of [...scores, ...bonusMappings]) {
    const parentId = requiredId(child.rating_id, 'Rating child parent identifier')
    if (!ratingsById.has(parentId)) {
      throw new Error(`Owned rating child references unavailable rating ${parentId}.`)
    }
  }

  for (const rating of ratings) {
    const cellarId = optionalId(rating.cellar_id)
    if (!cellarId) continue
    const cellarRecord = cellarById.get(cellarId)
    if (!cellarRecord) throw new Error(`Owned rating references unavailable cellar record ${cellarId}.`)
    if (requiredId(cellarRecord.product_id, 'Cellar product identifier') !==
        requiredId(rating.product_id, 'Rating product identifier')) {
      throw new Error(`Owned rating and cellar record ${cellarId} reference different products.`)
    }
  }
}

const countRecords = (data) => ({
  profiles: data.profiles.length,
  ratings: data.ratings.length,
  rating_scores: data.rating_scores.length,
  bonus_attribute_rating_mapping: data.bonus_attribute_rating_mapping.length,
  cellar: data.cellar.length,
  products: data.catalogue.products.length,
  producers: data.catalogue.producers.length,
  categories: data.catalogue.categories.length,
  rating_attributes: data.catalogue.rating_attributes.length,
  bonus_attributes: data.catalogue.bonus_attributes.length
})

export const buildAccountExportManifest = ({ account, snapshot, generatedAt = new Date().toISOString() }) => {
  if (!isPlainObject(account)) throw new Error('Authenticated account identity is invalid.')
  const ownerId = requiredId(account.id, 'Authenticated account identifier')
  const generated_at = isoDateTime(generatedAt, 'Account export generation time', { required: true })
  validateSnapshot(snapshot)

  const indexes = Object.fromEntries(ACCOUNT_EXPORT_COLLECTIONS.map((collection) => [
    collection,
    indexCollection(snapshot[collection], collection)
  ]))

  const ownedProfiles = exactOwnerRecords(snapshot.profiles, ownerId)
  if (ownedProfiles.length > 1) throw new Error('Account export snapshot contains multiple owned profiles.')

  const ownedRatings = exactOwnerRecords(snapshot.ratings, ownerId)
  const ownedScores = exactOwnerRecords(snapshot.rating_scores, ownerId)
  const ownedBonusMappings = exactOwnerRecords(snapshot.bonus_attribute_rating_mapping, ownerId)
  const ownedCellar = exactOwnerRecords(snapshot.cellar, ownerId)
  assertRatingRelationships(ownedRatings, ownedScores, ownedBonusMappings, ownedCellar)

  const productIds = new Set([
    ...idSet(ownedRatings, 'product_id'),
    ...idSet(ownedCellar, 'product_id')
  ])
  const products = selectedRecords(indexes.products, productIds, 'products')
  const producerIds = idSet(products, 'producer_id')
  const ratingAttributeIds = idSet(ownedScores, 'attribute_id')
  const ratingAttributes = selectedRecords(indexes.rating_attributes, ratingAttributeIds, 'rating_attributes')
  const categoryIds = new Set([
    ...idSet(products, 'product_category_id'),
    ...idSet(ratingAttributes, 'category_id')
  ])
  const bonusAttributeIds = idSet(ownedBonusMappings, 'bonus_attributes_id')

  const data = {
    profiles: projectSorted(ownedProfiles, projectProfile),
    ratings: projectSorted(ownedRatings, projectRating),
    rating_scores: projectSorted(ownedScores, projectRatingScore),
    bonus_attribute_rating_mapping: projectSorted(ownedBonusMappings, projectBonusMapping),
    cellar: projectSorted(ownedCellar, projectCellar),
    catalogue: {
      products: projectSorted(products, projectProduct),
      producers: projectSorted(selectedRecords(indexes.producers, producerIds, 'producers'), projectProducer),
      categories: projectSorted(selectedRecords(indexes.categories, categoryIds, 'categories'), projectCategory),
      rating_attributes: projectSorted(ratingAttributes, projectRatingAttribute),
      bonus_attributes: projectSorted(
        selectedRecords(indexes.bonus_attributes, bonusAttributeIds, 'bonus_attributes'),
        projectBonusAttribute
      )
    }
  }

  return {
    format: ACCOUNT_EXPORT_FORMAT,
    schema_version: ACCOUNT_EXPORT_SCHEMA_VERSION,
    generated_at,
    account: {
      id: ownerId,
      email: optionalText(account.email),
      name: optionalText(account.name)
    },
    record_counts: countRecords(data),
    collection_descriptions: { ...ACCOUNT_EXPORT_COLLECTION_DESCRIPTIONS },
    monetary_values: {
      fields: ['cellar.purchase_price', 'cellar.retail_price'],
      currency: null,
      status: 'not_recorded_in_source_schema'
    },
    data
  }
}
