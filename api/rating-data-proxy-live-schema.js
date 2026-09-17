import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { bonusScoreFromPoints, selectedBonusPointTotal } from '../src/lib/bonusAttributes.js'
import { completedRatingTotal } from '../src/lib/completedRatingContract.js'
import { canonicalRatingKey } from '../src/lib/ratingFormulaV1.js'
import { calculateRatingTotals } from '../src/utils/ratingSubmission.js'
import { requireSessionUser } from './_lib/authSession.js'
import { loadBonusCatalogue } from './_lib/bonusAttributeCatalogue.js'
import { dataProvider } from './_lib/dataProvider.js'
import { isOwnedBy, projectRating } from './_lib/dataPolicy.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const records = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)
const completeRating = (rating) => rating?.submission_state === 'complete' && completedRatingTotal(rating?.total_weighted) !== null
const providerDateTime = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const pathSegments = (request) => {
  const raw = request.query?.path
  return (Array.isArray(raw) ? raw : String(raw || '').split('/')).map(String).filter(Boolean)
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
  const scores = asArray(submittedScores).filter((score) => String(score?.attributeId ?? score?.attribute_id ?? '') !== bonusId)
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

const submissionId = (body) => {
  const supplied = String(body.submissionId ?? body.submission_id ?? '').trim()
  return supplied || crypto.randomUUID()
}

const fingerprintFor = ({ productId, cellarId, totals, bonusIds }) => crypto.createHash('sha256').update(JSON.stringify({
  productId: String(productId), cellarId: cellarId ?? null, scores: totals.scores, weights: totals.weights, bonusIds: [...bonusIds].sort()
})).digest('hex')

const findBySubmissionKey = async (userId, key) => records(await dataProvider.list(COLLECTIONS.ratings, {
  user_id: userId, submission_key: key
})).find((rating) => isOwnedBy(rating, userId) && rating.submission_key === key) || null

const childRows = async (ratingId, userId) => {
  const [scores, bonuses] = await Promise.all([
    dataProvider.list(COLLECTIONS.ratingScores, { rating_id: ratingId, user_id: userId }),
    dataProvider.list(COLLECTIONS.bonusRatingMappings, { rating_id: ratingId, user_id: userId })
  ])
  return {
    scores: records(scores).filter((row) => isOwnedBy(row, userId) && String(row.rating_id) === String(ratingId)),
    bonuses: records(bonuses).filter((row) => isOwnedBy(row, userId) && String(row.rating_id) === String(ratingId))
  }
}

const transition = async (rating, state, extra = {}) => {
  const version = Number.isSafeInteger(Number(rating.submission_version)) ? Number(rating.submission_version) : 0
  await dataProvider.update(COLLECTIONS.ratings, rating.id, { ...extra, submission_state: state, submission_version: version + 1 })
  const persisted = await dataProvider.get(COLLECTIONS.ratings, rating.id)
  if (!persisted || persisted.submission_state !== state) throw new Error('Rating workflow state was not durably updated.')
  return persisted
}

const reconcileExpectedChildren = async (rating, userId) => {
  const children = await childRows(rating.id, userId)
  const expectedScores = Number(rating.expected_score_count)
  const expectedBonuses = Number(rating.expected_bonus_count ?? 0)
  return {
    complete: Number.isSafeInteger(expectedScores) && expectedScores > 0 && children.scores.length === expectedScores &&
      Number.isSafeInteger(expectedBonuses) && expectedBonuses >= 0 && children.bonuses.length === expectedBonuses,
    ...children
  }
}

const submitRating = async (request, response, user) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const productId = positiveId(body.productId ?? body.product_id, 'Product identifier')
  const [product, attributes, bonusCatalogue] = await Promise.all([
    dataProvider.get(COLLECTIONS.products, productId),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    loadBonusCatalogue(user.id)
  ])
  if (!product || String(product.id ?? '') !== productId) return response.status(404).json({ error: 'Product not found.' })

  const requestedBonusIds = validateBonusIds(body.bonusAttributeIds, bonusCatalogue.bonusAttributes)
  const bonusPointTotal = selectedBonusPointTotal(bonusCatalogue.bonusAttributes, requestedBonusIds)
  const bonusScore = bonusScoreFromPoints(bonusPointTotal)
  const totals = calculateRatingTotals(scoresWithDerivedBonus(body.scores, attributes, bonusScore), records(attributes), body.weights)
  const cellar = await ownedCellarForRating(body, user.id, productId)
  const sid = submissionId(body)
  const key = `${user.id}:${sid}`
  const fingerprint = fingerprintFor({ productId, cellarId: cellar?.id ?? null, totals, bonusIds: requestedBonusIds })
  let rating = await findBySubmissionKey(user.id, key)
  let duplicate = Boolean(rating)

  if (rating && rating.submission_fingerprint !== fingerprint) {
    const error = new Error('The submission identifier is already used by different rating data.')
    error.status = 409
    throw error
  }
  if (rating?.submission_state === 'complete') {
    return response.status(200).json({ rating: projectRating(rating), scoreCount: Number(rating.expected_score_count), bonusCount: Number(rating.expected_bonus_count ?? 0), duplicate: true })
  }

  try {
    if (!rating) {
      rating = first(await dataProvider.create(COLLECTIONS.ratings, {
        user_id: user.id,
        product_id: product.id,
        cellar_id: cellar?.id ?? null,
        date_rated: providerDateTime(),
        total_unweighted: totals.total_unweighted,
        total_weighted: totals.total_weighted,
        submission_key: key,
        submission_fingerprint: fingerprint,
        submission_state: 'pending',
        submission_version: 0,
        expected_score_count: totals.scores.length,
        expected_bonus_count: requestedBonusIds.length,
        deleted_at: null
      }))
      if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
    }

    let existing = await childRows(rating.id, user.id)
    if (!existing.scores.length && !existing.bonuses.length) {
      for (const score of totals.scores) {
        await dataProvider.create(COLLECTIONS.ratingScores, {
          user_id: user.id, attribute_id: score.attribute_id, rating_id: rating.id, attribute_score: score.attribute_score
        })
      }
      for (const bonusId of requestedBonusIds) {
        await dataProvider.create(COLLECTIONS.bonusRatingMappings, {
          user_id: user.id, rating_id: rating.id, bonus_attributes_id: bonusId
        })
      }
    }

    const check = await reconcileExpectedChildren(rating, user.id)
    if (!check.complete) throw new Error('Rating child records did not reconcile with the expected submission.')
    rating = await transition(rating, 'complete')
    response.status(duplicate ? 200 : 201).json({
      rating: projectRating(rating), scoreCount: totals.scores.length, bonusCount: requestedBonusIds.length,
      bonusPointTotal, bonusScore, duplicate
    })
  } catch (error) {
    if (rating?.id && rating.submission_state !== 'complete') {
      try { await transition(rating, 'failed') } catch { /* preserve original failure */ }
    }
    throw error
  }
}

const reconcileHistorical = async (response, user) => {
  const pending = records(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id, submission_state: 'pending' }))
    .filter((rating) => isOwnedBy(rating, user.id))
  let completed = 0
  let skipped = 0
  for (const rating of pending) {
    if (rating.submission_key || completedRatingTotal(rating.total_weighted) === null) { skipped += 1; continue }
    const children = await childRows(rating.id, user.id)
    if (!children.scores.length) { skipped += 1; continue }
    const key = `legacy:${user.id}:${rating.id}`
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ legacyRatingId: String(rating.id), userId: String(user.id) })).digest('hex')
    await transition(rating, 'complete', {
      submission_key: key,
      submission_fingerprint: fingerprint,
      expected_score_count: children.scores.length,
      expected_bonus_count: children.bonuses.length
    })
    completed += 1
  }
  response.status(200).json({ examined: pending.length, completed, skipped })
}

const listUserRatings = async (response, user) => {
  const ownerRatings = records(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id, submission_state: 'complete' }))
    .filter((rating) => isOwnedBy(rating, user.id) && completeRating(rating))
  response.status(200).json({ items: ownerRatings.map(projectRating).sort((a, b) => String(b.date_rated || '').localeCompare(String(a.date_rated || ''))) })
}

const removeIfPresent = async (collection, id) => {
  if (!id) return
  try { await dataProvider.remove(collection, id) } catch (error) { if (error?.status !== 404) throw error }
}

const deleteRating = async (id, response, user) => {
  const ratingId = positiveId(id, 'Rating identifier')
  let rating = await dataProvider.get(COLLECTIONS.ratings, ratingId)
  if (!rating) return response.status(404).json({ error: 'Rating not found.' })
  if (!isOwnedBy(rating, user.id)) return response.status(403).json({ error: 'You are not authorised to delete this rating.' })
  rating = await transition(rating, 'deleting')
  const children = await childRows(ratingId, user.id)
  for (const row of [...children.scores, ...children.bonuses]) {
    const collection = children.scores.includes(row) ? COLLECTIONS.ratingScores : COLLECTIONS.bonusRatingMappings
    await removeIfPresent(collection, row.id)
  }
  await transition(rating, 'deleted', { deleted_at: providerDateTime() })
  response.status(204).end()
}

export const routeRatingRequest = async (request, response, user) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'ratings') return response.status(404).json({ error: 'Application data route not found.' })
  if (request.method === 'POST' && id === 'submit') return submitRating(request, response, user)
  if (request.method === 'POST' && id === 'reconcile') return reconcileHistorical(response, user)
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
    return response.status(405).json({ error: 'Method not allowed.' })
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, { key: request.method === 'GET' ? 'data-read' : 'data-write', limit: request.method === 'GET' ? 240 : 60 })) return
  try {
    const user = await requireSessionUser(request)
    await routeRatingRequest(request, response, user)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) writeTelemetryError(runtimeTelemetry({ route_template: '/api/nocodebackend/ratings/:action', method: request.method, status_class: `${Math.floor(status / 100)}xx`, event_name: 'gateway_failure', correlation_id: correlationId }))
    response.status(status).json(error.payload || { error: status < 500 && error.message ? error.message : safeErrorMessage(status), code: error.code, requestId: correlationId })
  }
}

export const __testables = { submitRating, reconcileHistorical, listUserRatings, deleteRating, reconcileExpectedChildren, completeRating, scoresWithDerivedBonus }
