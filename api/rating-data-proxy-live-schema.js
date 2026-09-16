import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { bonusScoreFromPoints, selectedBonusPointTotal } from '../src/lib/bonusAttributes.js'
import { completedRatingTotal } from '../src/lib/completedRatingContract.js'
import { buildAdvancedScore, canonicalRatingKey } from '../src/lib/ratingFormulaV1.js'
import { calculateRatingTotals } from '../src/utils/ratingSubmission.js'
import { requireSessionUser } from './_lib/authSession.js'
import { loadBonusCatalogue } from './_lib/bonusAttributeCatalogue.js'
import { dataProvider } from './_lib/dataProvider.js'
import { isOwnedBy, projectRating } from './_lib/dataPolicy.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './_lib/httpSecurity.js'
import { buildStyleScoreIndex, styleScaledScoreForRating } from './_lib/styleScaledScore.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const records = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)
const isCompletedRating = (rating) => completedRatingTotal(rating?.total_weighted) !== null

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

const canonicalPositiveId = (value) => {
  const text = String(value ?? '').trim()
  const number = Number(text)
  return Number.isSafeInteger(number) && number > 0 && String(number) === text ? text : null
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

const scoresWithDerivedBonus = (submittedScores, attributes, bonusScore) => {
  const bonusAttribute = records(attributes).find((attribute) => canonicalRatingKey(attribute.attribute_name) === 'bonus')
  if (!bonusAttribute?.id) {
    const error = new Error('The Bonus rating attribute is unavailable.')
    error.status = 503
    throw error
  }
  const bonusId = String(bonusAttribute.id)
  const scores = asArray(submittedScores)
    .filter((score) => String(score?.attributeId ?? score?.attribute_id ?? '') !== bonusId)
  scores.push({ attributeId: bonusAttribute.id, score: bonusScore })
  return scores
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

const loadExactRecords = async (collection, ids) => {
  const requested = new Set([...ids].map(canonicalPositiveId).filter(Boolean))
  if (!requested.size) return []
  return records(await dataProvider.list(collection, { 'id[in]': [...requested].join(',') }))
    .filter((record) => requested.has(canonicalPositiveId(record?.id)))
}

const scorePopulations = async () => {
  const ratingRows = records(await dataProvider.list(COLLECTIONS.ratings)).filter(isCompletedRating)
  const overall = Object.freeze(ratingRows
    .map((rating) => completedRatingTotal(rating.total_weighted))
    .filter((score) => score !== null))
  const productIds = new Set(ratingRows.map((rating) => canonicalPositiveId(rating.product_id)).filter(Boolean))
  const productRows = await loadExactRecords(COLLECTIONS.products, productIds)
  const categoryIds = new Set(productRows.map((product) => canonicalPositiveId(product.product_category_id)).filter(Boolean))
  const categoryRows = await loadExactRecords(COLLECTIONS.categories, categoryIds)
  return Object.freeze({
    overall,
    styleIndex: buildStyleScoreIndex({ ratings: ratingRows, products: productRows, categories: categoryRows })
  })
}

const advancedFor = (rating, populations, cellar = null) => ({
  ...buildAdvancedScore({
    score: completedRatingTotal(rating.total_weighted),
    population: populations?.overall || [],
    retailPrice: cellar?.retail_price,
    purchasePrice: cellar?.purchase_price,
    volumeMl: cellar?.mls
  }),
  ...styleScaledScoreForRating(rating, populations?.styleIndex)
})

const exactNamedRelationship = (record, id, nameField) => {
  if (!record || String(record.id ?? '') !== String(id ?? '')) return null
  const name = String(record[nameField] ?? '').trim()
  return name ? { id: record.id, [nameField]: name } : null
}

const productProjection = async (productId) => {
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product || String(product.id ?? '') !== String(productId)) return null
  const [producerRecord, categoryRecord] = await Promise.all([
    product.producer_id && String(product.producer_id) !== '0' ? dataProvider.get(COLLECTIONS.producers, product.producer_id) : null,
    product.product_category_id ? dataProvider.get(COLLECTIONS.categories, product.product_category_id) : null
  ])
  return {
    id: product.id,
    product_name: String(product.product_name || '').trim(),
    product_category_id: product.product_category_id ?? null,
    producer_id: product.producer_id ?? null,
    producer: exactNamedRelationship(producerRecord, product.producer_id, 'producer_name'),
    category: exactNamedRelationship(categoryRecord, product.product_category_id, 'category_name')
  }
}

const providerDateTime = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const removeIfPresent = async (collection, id) => {
  if (!id) return
  try { await dataProvider.remove(collection, id) } catch (error) { if (error?.status !== 404) throw error }
}

const submitRating = async (request, response, user, correlationId) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const productId = positiveId(body.productId ?? body.product_id, 'Product identifier')
  const [product, attributes, bonusCatalogue] = await Promise.all([
    dataProvider.get(COLLECTIONS.products, productId),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    loadBonusCatalogue(user.id)
  ])
  if (!product || String(product.id ?? '') !== productId) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }

  const requestedBonusIds = validateBonusIds(body.bonusAttributeIds, bonusCatalogue.bonusAttributes)
  const bonusPointTotal = selectedBonusPointTotal(bonusCatalogue.bonusAttributes, requestedBonusIds)
  const bonusScore = bonusScoreFromPoints(bonusPointTotal)
  const totals = calculateRatingTotals(
    scoresWithDerivedBonus(body.scores, attributes, bonusScore), records(attributes), body.weights
  )
  const cellar = await ownedCellarForRating(body, user.id, productId)
  const ratingPayload = {
    user_id: user.id,
    product_id: product.id,
    cellar_id: cellar?.id ?? null,
    date_rated: providerDateTime(),
    total_unweighted: totals.total_unweighted,
    total_weighted: totals.total_weighted
  }

  let rating = null
  const createdScores = []
  const createdBonuses = []
  try {
    const created = first(await dataProvider.create(COLLECTIONS.ratings, ratingPayload))
    if (!created?.id) throw new Error('The rating service did not return a rating identifier.')
    rating = { ...ratingPayload, ...created }

    for (const score of totals.scores) {
      const child = first(await dataProvider.create(COLLECTIONS.ratingScores, {
        user_id: user.id,
        attribute_id: score.attribute_id,
        rating_id: rating.id,
        attribute_score: score.attribute_score
      }))
      if (!child?.id) throw new Error('The rating service did not return a score identifier.')
      createdScores.push(child.id)
    }

    for (const bonusId of requestedBonusIds) {
      const child = first(await dataProvider.create(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id,
        rating_id: rating.id,
        bonus_attributes_id: bonusId
      }))
      if (!child?.id) throw new Error('The rating service did not return a bonus mapping identifier.')
      createdBonuses.push(child.id)
    }

    const populations = await scorePopulations()
    response.status(201).json({
      rating: { ...projectRating(rating), advanced_scores: advancedFor(rating, populations, cellar) },
      scoreCount: totals.scores.length,
      bonusCount: requestedBonusIds.length,
      bonusPointTotal,
      bonusScore,
      duplicate: false
    })
  } catch (error) {
    let cleanupFailed = false
    try {
      for (const id of createdBonuses.reverse()) await removeIfPresent(COLLECTIONS.bonusRatingMappings, id)
      for (const id of createdScores.reverse()) await removeIfPresent(COLLECTIONS.ratingScores, id)
      if (rating?.id) await removeIfPresent(COLLECTIONS.ratings, rating.id)
    } catch { cleanupFailed = true }
    writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action',
      method: 'POST',
      status_class: '5xx',
      event_name: cleanupFailed ? 'rating_cleanup_failure' : 'rating_submission_failure',
      correlation_id: correlationId
    }))
    if (error.status && error.status < 500) throw error
    const workflowError = new Error('Rating submission failed and can be retried.')
    workflowError.status = 502
    throw workflowError
  }
}

const listUserRatings = async (response, user) => {
  const ownerRatings = records(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id }))
    .filter((rating) => isOwnedBy(rating, user.id) && isCompletedRating(rating))
  const [populations, cellarRows] = await Promise.all([
    scorePopulations(),
    dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }).then(records)
  ])
  const cellarById = new Map(cellarRows.filter((item) => isOwnedBy(item, user.id)).map((item) => [String(item.id), item]))
  const productIds = [...new Set(ownerRatings.map((rating) => String(rating.product_id || '')).filter((id) => /^[1-9]\d*$/.test(id)))]
  const products = await Promise.all(productIds.map(async (id) => [id, await productProjection(id)]))
  const productsById = new Map(products)
  response.status(200).json({
    items: ownerRatings.map((rating) => ({
      ...projectRating(rating),
      advanced_scores: advancedFor(rating, populations, cellarById.get(String(rating.cellar_id)) || null),
      product: productsById.get(String(rating.product_id)) || null
    })).sort((left, right) => String(right.date_rated || '').localeCompare(String(left.date_rated || '')))
  })
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
  for (const collection of [COLLECTIONS.ratingScores, COLLECTIONS.bonusRatingMappings]) {
    const children = records(await dataProvider.list(collection, { rating_id: ratingId, user_id: user.id }))
    for (const listedChild of children) {
      const child = await dataProvider.get(collection, listedChild.id)
      if (isOwnedBy(child, user.id) && String(child.rating_id) === ratingId) await removeIfPresent(collection, child.id)
    }
  }
  await removeIfPresent(COLLECTIONS.ratings, ratingId)
  response.status(204).end()
}

export const routeRatingRequest = async (request, response, user, correlationId) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'ratings') return response.status(404).json({ error: 'Application data route not found.' })
  if (request.method === 'POST' && (id === 'submit' || id === 'reconcile')) return submitRating(request, response, user, correlationId)
  if (request.method === 'GET' && id === 'mine') return listUserRatings(response, user)
  if (request.method === 'DELETE' && id && !action) return deleteRating(id, response, user)
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
    await routeRatingRequest(request, response, user, correlationId)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action',
      method: request.method,
      status_class: `${Math.floor(status / 100)}xx`,
      event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure',
      correlation_id: correlationId
    }))
    response.status(status).json(error.payload || {
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code,
      requestId: correlationId
    })
  }
}

export const __testables = { routeRatingRequest, submitRating, listUserRatings, deleteRating, advancedFor, productProjection, scorePopulations, isCompletedRating, scoresWithDerivedBonus }
