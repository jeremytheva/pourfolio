import crypto from 'node:crypto'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'
import { COLLECTIONS } from '../src/data/contract.js'
import { calculateRatingTotals } from '../src/utils/ratingSubmission.js'
import { requireSessionUser } from './_lib/authSession.js'
import { dataProvider } from './_lib/dataProvider.js'
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
  projectRating,
  sanitiseCellarInput
} from './_lib/dataPolicy.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from './_lib/httpSecurity.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')
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

const parseCatalogueSearch = (value) => {
  const search = String(value || '').trim()
  if (search.length > 100 || [...search].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint < 32 || codePoint === 127
  })) {
    const error = new Error('Catalogue search is invalid.')
    error.status = 400
    throw error
  }
  return search
}

const indexById = (records) => new Map(records.map((record) => [String(record.id), record]))
const distinctIds = (records, field) => [...new Set(records
  .map((record) => record?.[field])
  .filter((id) => id !== undefined && id !== null && String(id).trim())
  .map(String))]

const loadRecordsById = async (collection, ids) => normaliseList(await Promise.all(
  [...new Set(ids.map(String))].map((id) => dataProvider.get(collection, id))
))

const hydrateProducts = async (products, targeted = false) => {
  const [producers, categories] = await Promise.all([
    targeted
      ? loadRecordsById(COLLECTIONS.producers, distinctIds(products, 'producer_id'))
      : dataProvider.list(COLLECTIONS.producers),
    targeted
      ? loadRecordsById(COLLECTIONS.categories, distinctIds(products, 'product_category_id'))
      : dataProvider.list(COLLECTIONS.categories)
  ])
  const producersById = indexById(normaliseList(producers))
  const categoriesById = indexById(normaliseList(categories))
  return products.map((product) => projectProduct(
    product,
    producersById.get(String(product.producer_id)),
    categoriesById.get(String(product.product_category_id))
  ))
}

const listProducts = async (request, response) => {
  const search = parseCatalogueSearch(request.query?.q)
  const page = Math.max(1, Number.parseInt(request.query?.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query?.limit, 10) || 24))
  const providerPage = await dataProvider.listPage(COLLECTIONS.products, {
    search: search || undefined, page, limit, orderBy: 'product_name', order: 'asc'
  })
  const hydrated = await hydrateProducts(normaliseList(providerPage.items), true)
  response.status(200).json({
    items: hydrated,
    page: providerPage.page,
    pageSize: providerPage.pageSize,
    total: providerPage.total,
    totalPages: providerPage.totalPages
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
  const validTotals = ratings
    .map((rating) => {
      const total = rating.total_weighted
      return total === null || (typeof total === 'string' && !total.trim()) ? Number.NaN : Number(total)
    })
    .filter(Number.isFinite)
  response.status(200).json({
    ...hydrated,
    ratingSummary: {
      count: validTotals.length,
      average: validTotals.length
        ? Number((validTotals.reduce((sum, value) => sum + value, 0) / validTotals.length).toFixed(2))
        : null
    },
    ratings: []
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

const removeCreatedRecords = async (created) => {
  let cleanupFailed = false
  for (const { collection, id } of created.reverse()) {
    try {
      await dataProvider.remove(collection, id)
    } catch (error) {
      if (error?.status !== 404) cleanupFailed = true
    }
  }
  return cleanupFailed
}

const submitRating = async (request, response, user, correlationId) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const productId = parsePositiveId(body.productId ?? body.product_id, 'Product identifier')
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

  const createdRecords = []
  try {
    const rating = firstRecord(await dataProvider.create(COLLECTIONS.ratings, {
      user_id: user.id,
      product_id: product.id,
      cellar_id: cellarId,
      date_rated: new Date().toISOString(),
      total_unweighted: totals.total_unweighted,
      total_weighted: totals.total_weighted
    }))
    if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
    createdRecords.push({ collection: COLLECTIONS.ratings, id: rating.id })

    for (const score of totals.scores) {
      const created = firstRecord(await dataProvider.create(COLLECTIONS.ratingScores, {
        user_id: user.id,
        attribute_id: score.attribute_id,
        rating_id: rating.id,
        attribute_score: score.attribute_score
      }))
      if (!created?.id) throw new Error('The rating service did not return a score identifier.')
      createdRecords.push({ collection: COLLECTIONS.ratingScores, id: created.id })
    }

    for (const bonusId of requestedBonusIds) {
      const created = firstRecord(await dataProvider.create(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id,
        rating_id: rating.id,
        bonus_attribute_id: bonusId
      }))
      if (!created?.id) throw new Error('The rating service did not return a bonus mapping identifier.')
      createdRecords.push({ collection: COLLECTIONS.bonusRatingMappings, id: created.id })
    }

    response.status(201).json({
      rating: projectRating({ ...rating, ...totals }),
      scoreCount: totals.scores.length,
      bonusCount: requestedBonusIds.length,
      duplicate: false
    })
  } catch (error) {
    const cleanupFailed = await removeCreatedRecords(createdRecords)
    writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action',
      method: 'POST',
      status_class: '5xx',
      event_name: cleanupFailed ? 'rating_compensation_failure' : 'rating_submission_failure',
      correlation_id: correlationId
    }))
    if (error.status && error.status < 500) throw error
    const workflowError = new Error(cleanupFailed
      ? 'Rating submission failed and cleanup could not be fully confirmed.'
      : 'Rating submission failed without being saved.')
    workflowError.status = 502
    throw workflowError
  }
}

const listUserRatings = async (response, user) => {
  const ratings = normaliseList(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id }))
    .filter((rating) => isOwnedBy(rating, user.id))
  const products = await loadRecordsById(COLLECTIONS.products, distinctIds(ratings, 'product_id'))
  const hydratedProducts = await hydrateProducts(products, true)
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

const deleteOwnedChildren = async (collection, ratingId, userId) => {
  const children = normaliseList(await dataProvider.list(collection, { rating_id: ratingId, user_id: userId }))
  for (const listedChild of children) {
    const child = await dataProvider.get(collection, listedChild.id)
    if (!isOwnedBy(child, userId) || String(child.rating_id) !== String(ratingId)) continue
    try {
      await dataProvider.remove(collection, child.id)
    } catch (error) {
      if (error?.status !== 404) throw error
    }
  }
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
  await deleteOwnedChildren(COLLECTIONS.ratingScores, id, user.id)
  await deleteOwnedChildren(COLLECTIONS.bonusRatingMappings, id, user.id)
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
  series_edition_id: record.series_edition_id ?? null,
  purchase_location_id: record.purchase_location_id ?? null,
  purchased_by_id: record.purchased_by_id ?? null,
  gift: Boolean(record.gift),
  gift_from: record.gift_from ?? null,
  bet_id: record.bet_id ?? null,
  notes: record.notes ?? '',
  status: record.status ?? 'on_hand',
  quantity_acquired: record.quantity_acquired ?? null,
  date_consumed: record.date_consumed ?? null,
  acquisition_type: record.acquisition_type ?? null,
  historical_import: Boolean(record.historical_import),
  product
})

const listCellar = async (response, user) => {
  const records = normaliseList(await dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }))
    .filter((record) => isOwnedBy(record, user.id))
  const products = await hydrateProducts(
    await loadRecordsById(COLLECTIONS.products, distinctIds(records, 'product_id')), true
  )
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
  if (updates.product_id !== undefined) {
    const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(updates.product_id, 'Product identifier'))
    if (!product) {
      response.status(404).json({ error: 'Product not found.' })
      return
    }
  }
  const updated = firstRecord(await dataProvider.update(COLLECTIONS.cellar, existing.id, updates))
  const merged = { ...existing, ...updated }
  const product = await dataProvider.get(COLLECTIONS.products, merged.product_id)
  const [hydrated] = product ? await hydrateProducts([product]) : [null]
  response.status(200).json({ item: projectCellarRecord(merged, hydrated) })
}

const deleteCellar = async (id, response, user) => {
  const record = await getOwnedCellarRecord(id, user)
  await dataProvider.remove(COLLECTIONS.cellar, record.id)
  response.status(204).end()
}

const routeRequest = async (request, response, user, correlationId) => {
  const [resource, id, action] = pathSegments(request)
  if (request.method === 'GET' && resource === 'catalog' && id === 'products' && !action) return listProducts(request, response)
  if (request.method === 'GET' && resource === 'catalog' && id === 'products' && action) return getProduct(action, response)
  if (request.method === 'GET' && resource === 'rating-form' && !id) return getRatingForm(request, response)
  if (request.method === 'POST' && resource === 'ratings' && id === 'submit') return submitRating(request, response, user, correlationId)
  if (request.method === 'POST' && resource === 'ratings' && id === 'reconcile') {
    response.status(409).json({
      error: 'Rating reconciliation requires database idempotency fields that are not present in the current schema.',
      code: 'rating_reconciliation_unavailable'
    })
    return
  }
  if (request.method === 'GET' && resource === 'ratings' && id === 'mine') return listUserRatings(response, user)
  if (request.method === 'DELETE' && resource === 'ratings' && id && !action) return deleteRating(id, response, user)
  if (resource === 'cellar' && !id && request.method === 'GET') return listCellar(response, user)
  if (resource === 'cellar' && !id && request.method === 'POST') return createCellar(request, response, user)
  if (resource === 'cellar' && id && !action && request.method === 'PUT') return updateCellar(id, request, response, user)
  if (resource === 'cellar' && id && !action && request.method === 'DELETE') return deleteCellar(id, response, user)
  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
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
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/:resource',
        method: request.method,
        status_class: `${Math.floor(status / 100)}xx`,
        event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure',
        correlation_id: correlationId
      }))
    }
    response.status(status).json(error.payload || {
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
  pathSegments,
  routeRequest,
  getProduct,
  getRatingForm,
  submitRating,
  listProducts,
  listUserRatings,
  listCellar,
  deleteRating,
  projectCellarRecord
}