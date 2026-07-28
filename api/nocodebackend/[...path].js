import crypto from 'node:crypto'
import { COLLECTIONS } from '../../src/data/contract.js'
import { calculateRatingTotals } from '../../src/utils/ratingSubmission.js'
import { requireSessionUser } from '../_lib/authSession.js'
import { dataProvider } from '../_lib/dataProvider.js'
import {
  BONUS_FIELDS,
  CATEGORY_FIELDS,
  PRODUCER_FIELDS,
  PRODUCT_FIELDS,
  PROFILE_FIELDS,
  RATING_FIELDS,
  isOwnedBy,
  projectAttribute,
  projectBonus,
  projectProduct,
  projectProfile,
  projectRating,
  sanitiseCellarInput,
  sanitiseProfileUpdates
} from '../_lib/dataPolicy.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from '../_lib/httpSecurity.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const firstRecord = (value) => (Array.isArray(value) ? value[0] || null : value || null)

const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  if (!raw) return []
  return String(raw).split('/').filter(Boolean)
}

const parsePositiveId = (value, label = 'Record identifier') => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) {
    const error = new Error(`${label} is invalid.`)
    error.status = 400
    throw error
  }
  return text
}

const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')

const findProfile = async (userId) => {
  const candidates = normaliseList(await dataProvider.list(COLLECTIONS.profiles, { user_id: userId }))
  return candidates.find((record) => isOwnedBy(record, userId)) || null
}

const indexById = (records) => new Map(records.map((record) => [String(record.id), record]))

const loadCatalogueRelationships = async () => {
  const [producers, categories] = await Promise.all([
    dataProvider.list(COLLECTIONS.producers),
    dataProvider.list(COLLECTIONS.categories)
  ])

  return {
    producers: indexById(normaliseList(producers)),
    categories: indexById(normaliseList(categories))
  }
}

const hydrateProducts = async (products) => {
  const relationships = await loadCatalogueRelationships()
  return products.map((product) => projectProduct(
    product,
    relationships.producers.get(String(product.producer_id)),
    relationships.categories.get(String(product.product_category_id))
  ))
}

const listProducts = async (request, response) => {
  const search = String(request.query?.q || '').trim().toLocaleLowerCase()
  const page = Math.max(1, Number.parseInt(request.query?.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query?.limit, 10) || 24))
  const products = normaliseList(await dataProvider.list(COLLECTIONS.products))
  const hydrated = await hydrateProducts(products)
  const filtered = search
    ? hydrated.filter((product) => [
        product.product_name,
        product.declared_category,
        product.producer?.producer_name,
        product.category?.category_name
      ].some((value) => String(value || '').toLocaleLowerCase().includes(search)))
    : hydrated

  const offset = (page - 1) * limit
  response.status(200).json({
    items: filtered.slice(offset, offset + limit),
    page,
    pageSize: limit,
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit))
  })
}

const getProduct = async (productId, response) => {
  const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(productId, 'Product identifier'))
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }

  const [hydrated] = await hydrateProducts([product])
  const ratings = normaliseList(await dataProvider.list(COLLECTIONS.ratings, {
    product_id: product.id,
    fields: 'total_weighted'
  }))
  const totals = ratings
    .map((rating) => {
      const total = rating.total_weighted
      return total === null || (typeof total === 'string' && !total.trim()) ? Number.NaN : Number(total)
    })
    .filter(Number.isFinite)

  response.status(200).json({
    ...hydrated,
    ratingSummary: {
      count: ratings.length,
      average: totals.length
        ? Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2))
        : null
    }
  })
}

const getRatingForm = async (request, response) => {
  const productId = parsePositiveId(request.query?.product_id, 'Product identifier')
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }

  const [hydratedProduct, attributes, bonuses] = await Promise.all([
    hydrateProducts([product]).then(([record]) => record),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    dataProvider.list(COLLECTIONS.bonusAttributes)
  ])

  response.status(200).json({
    product: hydratedProduct,
    attributes: normaliseList(attributes)
      .filter((attribute) => Number(attribute.is_scored) === 1)
      .map(projectAttribute),
    bonusAttributes: normaliseList(bonuses).map(projectBonus)
  })
}

const submissionFingerprint = (productId, cellarId, scores, bonusIds) => crypto
  .createHash('sha256')
  .update(JSON.stringify({ productId: String(productId), cellarId, scores, bonusIds: [...bonusIds].sort() }))
  .digest('hex')

const submissionKey = (userId, submissionId) => `${userId}:${submissionId}`
const scoreKey = (key, attributeId) => `${key}:score:${attributeId}`
const bonusKey = (key, bonusId) => `${key}:bonus:${bonusId}`

const findSubmission = async (userId, submissionId) => normaliseList(await dataProvider.list(
  COLLECTIONS.ratings,
  { user_id: userId, rating_id: submissionId }
)).find((rating) => isOwnedBy(rating, userId) && Number(rating.rating_id) === submissionId) || null

const validateSubmissionChildren = async (rating, userId, expectedScores, expectedBonusIds, key) => {
  const [scores, bonuses] = await Promise.all([
    dataProvider.list(COLLECTIONS.ratingScores, { rating_id: rating.id, user_id: userId }),
    dataProvider.list(COLLECTIONS.bonusRatingMappings, { rating_id: rating.id, user_id: userId })
  ])
  const ownedScores = normaliseList(scores).filter((item) => isOwnedBy(item, userId))
  const ownedBonuses = normaliseList(bonuses).filter((item) => isOwnedBy(item, userId))
  const expectedScoreKeys = new Set(expectedScores.map((score) => scoreKey(key, score.attribute_id)))
  const expectedBonusKeys = new Set(expectedBonusIds.map((id) => bonusKey(key, id)))
  return {
    complete: ownedScores.length === expectedScoreKeys.size && ownedBonuses.length === expectedBonusKeys.size &&
      ownedScores.every((item) => expectedScoreKeys.has(item.uniqueness_key)) &&
      ownedBonuses.every((item) => expectedBonusKeys.has(item.uniqueness_key)),
    scoreKeys: new Set(ownedScores.map((item) => item.uniqueness_key)),
    bonusKeys: new Set(ownedBonuses.map((item) => item.uniqueness_key))
  }
}

const createChildIdempotently = async (collection, body, loadExisting) => {
  try {
    const created = firstRecord(await dataProvider.create(collection, body))
    if (!created?.id) throw new Error('The rating service did not return a child identifier.')
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    const existing = await loadExisting()
    const matchesExpected = existing && Object.entries(body).every(([field, value]) =>
      String(existing[field] ?? '') === String(value ?? '')
    )
    if (!matchesExpected || !isOwnedBy(existing, body.user_id)) throw error
  }
}

const submitRating = async (request, response, user, correlationId) => {
  const body = request.body && typeof request.body === 'object' ? request.body : {}
  const productId = parsePositiveId(body.productId ?? body.product_id, 'Product identifier')
  const submissionId = Number(body.submissionId ?? body.rating_id)
  if (!Number.isSafeInteger(submissionId) || submissionId <= 0) {
    const error = new Error('Rating submission identifier is invalid.')
    error.status = 400
    throw error
  }

  const [product, attributes, bonuses] = await Promise.all([
    dataProvider.get(COLLECTIONS.products, productId),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    dataProvider.list(COLLECTIONS.bonusAttributes)
  ])
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }

  const applicableAttributes = normaliseList(attributes).filter((attribute) => Number(attribute.is_scored) === 1)
  const totals = calculateRatingTotals(body.scores, applicableAttributes)
  const requestedBonusIds = [...new Set(asArray(body.bonusAttributeIds).map((value) => String(value)))]
  const validBonusIds = new Set(normaliseList(bonuses).map((bonus) => String(bonus.id)))
  if (requestedBonusIds.some((id) => !validBonusIds.has(id))) {
    const error = new Error('A selected bonus attribute is not valid.')
    error.status = 400
    throw error
  }

  let cellarId = null
  if (body.cellarId ?? body.cellar_id) {
    cellarId = parsePositiveId(body.cellarId ?? body.cellar_id, 'Cellar identifier')
    const cellarRecord = await dataProvider.get(COLLECTIONS.cellar, cellarId)
    if (!isOwnedBy(cellarRecord, user.id) || String(cellarRecord.product_id) !== productId) {
      const error = new Error('The cellar record is not available for this rating.')
      error.status = 403
      throw error
    }
  }

  const key = submissionKey(user.id, submissionId)
  const fingerprint = submissionFingerprint(productId, cellarId, totals.scores, requestedBonusIds)
  let rating = await findSubmission(user.id, submissionId)
  let duplicate = Boolean(rating)
  if (rating && rating.submission_fingerprint !== fingerprint) {
    const error = new Error('The submission identifier is already used by different rating data.')
    error.status = 409
    throw error
  }

  try {
    if (!rating) {
      try {
        rating = firstRecord(await dataProvider.create(COLLECTIONS.ratings, {
          user_id: user.id, rating_id: submissionId, submission_key: key,
          submission_fingerprint: fingerprint, submission_state: 'pending',
          expected_score_count: totals.scores.length, expected_bonus_count: requestedBonusIds.length,
          product_id: product.id, cellar_id: cellarId, date_rated: new Date().toISOString(),
          total_unweighted: totals.total_unweighted, total_weighted: totals.total_weighted
        }))
      } catch (error) {
        rating = await findSubmission(user.id, submissionId)
        if (!rating || (!dataProvider.isUniqueConflict(error) && error?.name !== 'TimeoutError')) throw error
        duplicate = true
      }
      if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
      if (!isOwnedBy(rating, user.id) || rating.submission_fingerprint !== fingerprint) {
        const conflict = new Error('The submission identifier is already used by different rating data.')
        conflict.status = 409
        throw conflict
      }
    }

    const children = await validateSubmissionChildren(rating, user.id, totals.scores, requestedBonusIds, key)

    for (const score of totals.scores) {
      const uniquenessKey = scoreKey(key, score.attribute_id)
      if (children.scoreKeys.has(uniquenessKey)) continue
      await createChildIdempotently(COLLECTIONS.ratingScores, {
        user_id: user.id, attribute_id: score.attribute_id, rating_id: rating.id,
        attribute_score: score.attribute_score, uniqueness_key: uniquenessKey
      }, async () => normaliseList(await dataProvider.list(COLLECTIONS.ratingScores, {
        user_id: user.id, uniqueness_key: uniquenessKey
      }))[0])
    }

    for (const bonusId of requestedBonusIds) {
      const uniquenessKey = bonusKey(key, bonusId)
      if (children.bonusKeys.has(uniquenessKey)) continue
      await createChildIdempotently(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id, rating_id: rating.id, bonus_attributes_id: bonusId, uniqueness_key: uniquenessKey
      }, async () => normaliseList(await dataProvider.list(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id, uniqueness_key: uniquenessKey
      }))[0])
    }

    const completed = await validateSubmissionChildren(rating, user.id, totals.scores, requestedBonusIds, key)
    if (!completed.complete) throw new Error('Rating children remain incomplete after reconciliation.')
    rating = { ...rating, ...firstRecord(await dataProvider.update(COLLECTIONS.ratings, rating.id, { submission_state: 'complete' })) }

    response.status(duplicate ? 200 : 201).json({
      rating: projectRating({ ...rating, ...totals }),
      scoreCount: totals.scores.length,
      bonusCount: requestedBonusIds.length,
      duplicate
    })
  } catch (error) {
    let stateUpdateFailed = false
    if (rating?.id) {
      try { await dataProvider.update(COLLECTIONS.ratings, rating.id, { submission_state: 'failed' }) } catch { stateUpdateFailed = true }
    }
    console.error('Rating reconciliation failed', { correlationId, stateUpdateFailed, submissionState: 'failed' })
    if (error.status && error.status < 500) throw error
    const workflowError = new Error('Rating submission is incomplete and can be retried safely.')
    workflowError.status = 502
    throw workflowError
  }
}

const listUserRatings = async (response, user) => {
  const ratings = normaliseList(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id }))
    .filter((rating) => isOwnedBy(rating, user.id))
  const products = normaliseList(await dataProvider.list(COLLECTIONS.products))
  const hydratedProducts = await hydrateProducts(products)
  const productsById = indexById(hydratedProducts)

  response.status(200).json({
    items: ratings
      .map((rating) => ({
        ...projectRating(rating),
        product: productsById.get(String(rating.product_id)) || null
      }))
      .sort((left, right) => String(right.date_rated || '').localeCompare(String(left.date_rated || '')))
  })
}

const deleteRating = async (ratingId, response, user) => {
  const id = parsePositiveId(ratingId, 'Rating identifier')
  const rating = await dataProvider.get(COLLECTIONS.ratings, id)
  if (!rating) {
    response.status(404).json({ error: 'Rating not found.' })
    return
  }
  if (!isOwnedBy(rating, user.id)) {
    response.status(403).json({ error: 'You are not authorised to delete this rating.' })
    return
  }

  const [scores, bonuses] = await Promise.all([
    dataProvider.list(COLLECTIONS.ratingScores, { rating_id: id, user_id: user.id }),
    dataProvider.list(COLLECTIONS.bonusRatingMappings, { rating_id: id, user_id: user.id })
  ])
  for (const child of [...normaliseList(scores), ...normaliseList(bonuses)]) {
    if (isOwnedBy(child, user.id)) {
      const collection = child.bonus_attributes_id === undefined
        ? COLLECTIONS.ratingScores
        : COLLECTIONS.bonusRatingMappings
      await dataProvider.remove(collection, child.id)
    }
  }
  await dataProvider.remove(COLLECTIONS.ratings, id)
  response.status(204).end()
}

const projectCellarRecord = (record, product = null) => ({
  id: record.id,
  product_id: record.product_id,
  location_id: record.location_id ?? null,
  quantity: record.quantity ?? 0,
  mls: record.mls ?? null,
  container: record.container ?? null,
  purchase_price: record.purchase_price ?? null,
  retail_price: record.retail_price ?? null,
  date_received: record.date_received ?? null,
  sharing_series_id: record.sharing_series_id ?? null,
  series_version_id: record.series_version_id ?? null,
  purchase_location_id: record.purchase_location_id ?? null,
  gift: Boolean(record.gift),
  gift_from: record.gift_from ?? null,
  notes: record.notes ?? '',
  product
})

const listCellar = async (response, user) => {
  const records = normaliseList(await dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }))
    .filter((record) => isOwnedBy(record, user.id))
  const products = await hydrateProducts(normaliseList(await dataProvider.list(COLLECTIONS.products)))
  const productsById = indexById(products)
  response.status(200).json({
    items: records.map((record) => projectCellarRecord(record, productsById.get(String(record.product_id)) || null))
  })
}

const createCellar = async (request, response, user) => {
  const input = sanitiseCellarInput(request.body || {})
  const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(input.product_id, 'Product identifier'))
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const created = firstRecord(await dataProvider.create(COLLECTIONS.cellar, {
    ...input,
    user_id: user.id,
    date_received: input.date_received || new Date().toISOString().slice(0, 10)
  }))
  const [hydrated] = await hydrateProducts([product])
  response.status(201).json({ item: projectCellarRecord(created, hydrated) })
}

const getOwnedCellarRecord = async (id, user) => {
  const record = await dataProvider.get(COLLECTIONS.cellar, parsePositiveId(id, 'Cellar identifier'))
  if (!record) {
    const error = new Error('Cellar record not found.')
    error.status = 404
    throw error
  }
  if (!isOwnedBy(record, user.id)) {
    const error = new Error('You are not authorised to change this cellar record.')
    error.status = 403
    throw error
  }
  return record
}

const updateCellar = async (id, request, response, user) => {
  const existing = await getOwnedCellarRecord(id, user)
  const updates = sanitiseCellarInput(request.body || {}, { partial: true })
  if (updates.product_id && String(updates.product_id) !== String(existing.product_id)) {
    const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(updates.product_id, 'Product identifier'))
    if (!product) {
      response.status(404).json({ error: 'Product not found.' })
      return
    }
  }
  const updated = firstRecord(await dataProvider.update(COLLECTIONS.cellar, existing.id, updates))
  const product = await dataProvider.get(COLLECTIONS.products, updated.product_id || existing.product_id)
  const [hydrated] = product ? await hydrateProducts([product]) : [null]
  response.status(200).json({ item: projectCellarRecord({ ...existing, ...updated }, hydrated) })
}

const deleteCellar = async (id, response, user) => {
  const record = await getOwnedCellarRecord(id, user)
  await dataProvider.remove(COLLECTIONS.cellar, record.id)
  response.status(204).end()
}

const getProfile = async (response, user) => {
  const profile = await findProfile(user.id)
  response.status(200).json({
    profile: {
      id: user.id,
      name: profile?.name || user.name || 'User',
      description: profile?.description || '',
      avatar_url: profile?.avatar_url || null
    }
  })
}

const updateProfile = async (request, response, user) => {
  const updates = sanitiseProfileUpdates(request.body || {})
  const existing = await findProfile(user.id)
  const saved = existing?.id
    ? firstRecord(await dataProvider.update(COLLECTIONS.profiles, existing.id, updates))
    : firstRecord(await dataProvider.create(COLLECTIONS.profiles, {
        id: user.id,
        user_id: user.id,
        ...updates
      }))

  response.status(200).json({ profile: projectProfile({ ...existing, ...saved, id: user.id }) })
}

const routeRequest = async (request, response, user, correlationId) => {
  const segments = pathSegments(request)
  const [resource, id, action] = segments

  if (request.method === 'GET' && resource === 'catalog' && id === 'products' && !action) {
    return listProducts(request, response)
  }
  if (request.method === 'GET' && resource === 'catalog' && id === 'products' && action) {
    return getProduct(action, response)
  }
  if (request.method === 'GET' && resource === 'rating-form' && !id) {
    return getRatingForm(request, response)
  }
  if (request.method === 'POST' && resource === 'ratings' && id === 'submit') {
    return submitRating(request, response, user, correlationId)
  }
  if (request.method === 'POST' && resource === 'ratings' && id === 'reconcile') {
    return submitRating(request, response, user, correlationId)
  }
  if (request.method === 'GET' && resource === 'ratings' && id === 'mine') {
    return listUserRatings(response, user)
  }
  if (request.method === 'DELETE' && resource === 'ratings' && id && !action) {
    return deleteRating(id, response, user)
  }
  if (resource === 'cellar' && !id && request.method === 'GET') {
    return listCellar(response, user)
  }
  if (resource === 'cellar' && !id && request.method === 'POST') {
    return createCellar(request, response, user)
  }
  if (resource === 'cellar' && id && !action && request.method === 'PUT') {
    return updateCellar(id, request, response, user)
  }
  if (resource === 'cellar' && id && !action && request.method === 'DELETE') {
    return deleteCellar(id, response, user)
  }
  if (resource === 'profile' && !id && request.method === 'GET') {
    return getProfile(response, user)
  }
  if (resource === 'profile' && !id && request.method === 'PUT') {
    return updateProfile(request, response, user)
  }

  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  const correlationId = request.headers?.['x-request-id'] || crypto.randomUUID()
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')

  if (!ALLOWED_METHODS.has(request.method)) {
    response.setHeader('Allow', [...ALLOWED_METHODS].join(', '))
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, {
    key: request.method === 'GET' ? 'data-read' : 'data-write',
    limit: request.method === 'GET' ? 240 : 60
  })) return

  try {
    const user = await requireSessionUser(request)
    await routeRequest(request, response, user, correlationId)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      console.error('Application data gateway error', {
        correlationId,
        status,
        name: error.name
      })
    }
    response.status(status).json({
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      requestId: correlationId
    })
  }
}

export const __testables = {
  PRODUCT_FIELDS,
  PRODUCER_FIELDS,
  CATEGORY_FIELDS,
  RATING_FIELDS,
  BONUS_FIELDS,
  PROFILE_FIELDS,
  findProfile,
  getProduct,
  getProfile,
  updateProfile,
  submitRating
}
