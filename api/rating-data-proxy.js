import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { buildAdvancedScore } from '../src/lib/ratingFormulaV1.js'
import { calculateRatingTotals } from '../src/utils/ratingSubmission.js'
import { requireSessionUser } from './_lib/authSession.js'
import { dataProvider } from './_lib/dataProvider.js'
import { isOwnedBy, projectRating } from './_lib/dataPolicy.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const records = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)

const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  return String(raw || '').split('/').filter(Boolean)
}

const positiveId = (value, label = 'Record identifier') => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) {
    const error = new Error(`${label} is invalid.`)
    error.status = 400
    throw error
  }
  return text
}

const removeCreatedRecords = async (created) => {
  let cleanupFailed = false
  for (const { collection, id } of [...created].reverse()) {
    try {
      await dataProvider.remove(collection, id)
    } catch (error) {
      if (error?.status !== 404) cleanupFailed = true
    }
  }
  return cleanupFailed
}

const validateBonusIds = (requested, available) => {
  const selected = [...new Set(asArray(requested).map(String))]
  const valid = new Set(records(available).map((bonus) => String(bonus.id)))
  if (selected.some((id) => !valid.has(id))) {
    const error = new Error('A selected bonus attribute is not valid.')
    error.status = 400
    throw error
  }
  return selected
}

const ownedCellarForRating = async (body, userId, productId) => {
  const raw = body.cellarId ?? body.cellar_id
  if (raw === undefined || raw === null || raw === '') return null
  const id = positiveId(raw, 'Cellar identifier')
  const cellar = await dataProvider.get(COLLECTIONS.cellar, id)
  if (!isOwnedBy(cellar, userId) || String(cellar.product_id) !== String(productId)) {
    const error = new Error('The cellar record is not available for this rating.')
    error.status = 403
    throw error
  }
  return cellar
}

const populationScores = async () => records(await dataProvider.list(COLLECTIONS.ratings))
  .map((rating) => Number(rating.total_weighted))
  .filter((score) => Number.isFinite(score) && score >= 0 && score <= 5)

const advancedFor = (rating, population, cellar = null) => buildAdvancedScore({
  score: Number(rating.total_weighted),
  population,
  retailPrice: cellar?.retail_price,
  purchasePrice: cellar?.purchase_price,
  volumeMl: cellar?.mls
})

const productProjection = async (productId) => {
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product) return null
  let producer = null
  if (product.producer_id && String(product.producer_id) !== '0') {
    producer = await dataProvider.get(COLLECTIONS.producers, product.producer_id)
  }
  return {
    id: product.id,
    product_name: product.product_name,
    producer: producer ? { id: producer.id, producer_name: producer.producer_name } : null
  }
}

const submitRating = async (request, response, user, correlationId) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const productId = positiveId(body.productId ?? body.product_id, 'Product identifier')
  const [product, attributes, bonuses] = await Promise.all([
    dataProvider.get(COLLECTIONS.products, productId),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    dataProvider.list(COLLECTIONS.bonusAttributes)
  ])
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }

  const totals = calculateRatingTotals(body.scores, records(attributes), body.weights)
  const requestedBonusIds = validateBonusIds(body.bonusAttributeIds, bonuses)
  const cellar = await ownedCellarForRating(body, user.id, productId)
  const created = []

  try {
    const rating = first(await dataProvider.create(COLLECTIONS.ratings, {
      user_id: user.id,
      product_id: product.id,
      cellar_id: cellar?.id ?? null,
      date_rated: new Date().toISOString(),
      total_unweighted: totals.total_unweighted,
      total_weighted: totals.total_weighted
    }))
    if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
    created.push({ collection: COLLECTIONS.ratings, id: rating.id })

    for (const score of totals.scores) {
      const child = first(await dataProvider.create(COLLECTIONS.ratingScores, {
        user_id: user.id,
        rating_id: rating.id,
        attribute_id: score.attribute_id,
        attribute_score: score.attribute_score
      }))
      if (!child?.id) throw new Error('The rating service did not return a score identifier.')
      created.push({ collection: COLLECTIONS.ratingScores, id: child.id })
    }

    for (const bonusId of requestedBonusIds) {
      const child = first(await dataProvider.create(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id,
        rating_id: rating.id,
        bonus_attributes_id: bonusId
      }))
      if (!child?.id) throw new Error('The rating service did not return a bonus mapping identifier.')
      created.push({ collection: COLLECTIONS.bonusRatingMappings, id: child.id })
    }

    const saved = { ...rating, ...totals }
    const population = await populationScores()
    response.status(201).json({
      rating: { ...projectRating(saved), advanced_scores: advancedFor(saved, population, cellar) },
      scoreCount: totals.scores.length,
      bonusCount: requestedBonusIds.length,
      duplicate: false
    })
  } catch (error) {
    const cleanupFailed = await removeCreatedRecords(created)
    writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action', method: 'POST', status_class: '5xx',
      event_name: cleanupFailed ? 'rating_compensation_failure' : 'rating_submission_failure', correlation_id: correlationId
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
  const ownerRatings = records(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id }))
    .filter((rating) => isOwnedBy(rating, user.id))
  const [population, cellarRows] = await Promise.all([
    populationScores(),
    dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }).then(records)
  ])
  const cellarById = new Map(cellarRows.filter((item) => isOwnedBy(item, user.id)).map((item) => [String(item.id), item]))
  const productIds = [...new Set(ownerRatings.map((rating) => String(rating.product_id)).filter(Boolean))]
  const products = await Promise.all(productIds.map(async (id) => [id, await productProjection(id)]))
  const productsById = new Map(products)

  response.status(200).json({
    items: ownerRatings.map((rating) => ({
      ...projectRating(rating),
      advanced_scores: advancedFor(rating, population, cellarById.get(String(rating.cellar_id)) || null),
      product: productsById.get(String(rating.product_id)) || null
    })).sort((left, right) => String(right.date_rated || '').localeCompare(String(left.date_rated || '')))
  })
}

const deleteOwnedChildren = async (collection, ratingId, userId) => {
  const children = records(await dataProvider.list(collection, { rating_id: ratingId, user_id: userId }))
  for (const child of children) {
    const exact = await dataProvider.get(collection, child.id)
    if (!isOwnedBy(exact, userId) || String(exact.rating_id) !== String(ratingId)) continue
    try {
      await dataProvider.remove(collection, exact.id)
    } catch (error) {
      if (error?.status !== 404) throw error
    }
  }
}

const deleteRating = async (id, response, user) => {
  const ratingId = positiveId(id, 'Rating identifier')
  const rating = await dataProvider.get(COLLECTIONS.ratings, ratingId)
  if (!rating) {
    response.status(404).json({ error: 'Rating not found.' })
    return
  }
  if (!isOwnedBy(rating, user.id)) {
    response.status(403).json({ error: 'You are not authorised to delete this rating.' })
    return
  }
  await deleteOwnedChildren(COLLECTIONS.ratingScores, ratingId, user.id)
  await deleteOwnedChildren(COLLECTIONS.bonusRatingMappings, ratingId, user.id)
  await dataProvider.remove(COLLECTIONS.ratings, ratingId)
  response.status(204).end()
}

export const routeRatingRequest = async (request, response, user, correlationId) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'ratings') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }
  if (request.method === 'POST' && id === 'submit') return submitRating(request, response, user, correlationId)
  if (request.method === 'GET' && id === 'mine') return listUserRatings(response, user)
  if (request.method === 'DELETE' && id && !action) return deleteRating(id, response, user)
  if (request.method === 'POST' && id === 'reconcile') {
    response.status(409).json({
      error: 'Rating reconciliation requires database idempotency fields that are not present in the current schema.',
      code: 'rating_reconciliation_unavailable'
    })
    return
  }
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
  if (!enforceRateLimit(request, response, { key: request.method === 'GET' ? 'data-read' : 'data-write', limit: request.method === 'GET' ? 240 : 60 })) return
  try {
    const user = await requireSessionUser(request)
    await routeRatingRequest(request, response, user, correlationId)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action', method: request.method,
      status_class: `${Math.floor(status / 100)}xx`, event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure',
      correlation_id: correlationId
    }))
    response.status(status).json(error.payload || {
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code,
      requestId: correlationId
    })
  }
}

export const __testables = { routeRatingRequest, submitRating, listUserRatings, deleteRating, advancedFor }
