import { ApiError } from '../lib/nocodeBackend.js'

const INVALID_PUBLIC_PROFILE_MESSAGE = 'The server returned invalid profile data. Please try again.'

const PAYLOAD_KEYS = new Set(['profile', 'ratings', 'summary'])
const PROFILE_KEYS = new Set(['public_id', 'name', 'description', 'avatar_url'])
const SUMMARY_KEYS = new Set(['count', 'average'])
const RATING_KEYS = new Set(['id', 'product_id', 'date_rated', 'total_unweighted', 'total_weighted', 'product'])
const PRODUCT_KEYS = new Set(['id', 'product_name', 'producer'])
const PRODUCER_KEYS = new Set(['id', 'producer_name'])
const PUBLIC_PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

const invalid = () => {
  throw new ApiError(INVALID_PUBLIC_PROFILE_MESSAGE, { code: 'invalid_public_profile_response' })
}

const plainObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const hasOnlyKeys = (value, allowed) => Object.keys(value).every((key) => allowed.has(key))
const nonEmptyString = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const nullableString = (value, max) => value === null || (typeof value === 'string' && value.length <= max)
const positiveId = (value) => /^[1-9]\d*$/.test(String(value ?? ''))
const finiteScore = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 5

const validateProducer = (producer) => {
  if (producer === null) return null
  if (!plainObject(producer) || !hasOnlyKeys(producer, PRODUCER_KEYS)) invalid()
  if (!positiveId(producer.id) || !nonEmptyString(producer.producer_name, 255)) invalid()
  return producer
}

const validateProduct = (product, productId) => {
  if (!plainObject(product) || !hasOnlyKeys(product, PRODUCT_KEYS)) invalid()
  if (!positiveId(product.id) || String(product.id) !== String(productId)) invalid()
  if (!nonEmptyString(product.product_name, 255)) invalid()
  validateProducer(product.producer ?? null)
  return product
}

const validateRating = (rating) => {
  if (!plainObject(rating) || !hasOnlyKeys(rating, RATING_KEYS)) invalid()
  if (!positiveId(rating.id) || !positiveId(rating.product_id)) invalid()
  if (!nonEmptyString(rating.date_rated, 64)) invalid()
  if (!finiteScore(rating.total_weighted)) invalid()
  if (rating.total_unweighted !== undefined && rating.total_unweighted !== null && !finiteScore(rating.total_unweighted)) invalid()
  validateProduct(rating.product, rating.product_id)
  return rating
}

export const validatePublicProfileResponse = (payload, expectedPublicId = null) => {
  if (!plainObject(payload) || !hasOnlyKeys(payload, PAYLOAD_KEYS)) invalid()
  if (!plainObject(payload.profile) || !hasOnlyKeys(payload.profile, PROFILE_KEYS)) invalid()
  if (!nonEmptyString(payload.profile.public_id, 128) || !PUBLIC_PROFILE_ID_PATTERN.test(payload.profile.public_id)) invalid()
  if (expectedPublicId !== null && payload.profile.public_id !== expectedPublicId) invalid()
  if (!nonEmptyString(payload.profile.name, 120)) invalid()
  if (!nullableString(payload.profile.description, 1000)) invalid()
  if (!nullableString(payload.profile.avatar_url, 2048)) invalid()

  if (!Array.isArray(payload.ratings)) invalid()
  const ids = new Set()
  for (const rating of payload.ratings) {
    validateRating(rating)
    if (ids.has(String(rating.id))) invalid()
    ids.add(String(rating.id))
  }

  if (!plainObject(payload.summary) || !hasOnlyKeys(payload.summary, SUMMARY_KEYS)) invalid()
  if (!Number.isSafeInteger(payload.summary.count) || payload.summary.count < 0 || payload.summary.count !== payload.ratings.length) invalid()
  if (payload.summary.count === 0) {
    if (payload.summary.average !== null) invalid()
  } else if (!finiteScore(payload.summary.average)) invalid()

  return payload
}

export const normalisePublicProfileId = (value) => {
  const id = String(value ?? '').trim()
  if (!PUBLIC_PROFILE_ID_PATTERN.test(id)) {
    throw new ApiError('Profile identifier is invalid.', { status: 400, code: 'invalid_profile_identifier' })
  }
  return id
}
