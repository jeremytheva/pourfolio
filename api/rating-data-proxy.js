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
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const records = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)
const isCompletedRating = (rating) =>
  rating?.submission_state === 'complete' && completedRatingTotal(rating?.total_weighted) !== null

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

const submissionIdentifier = (body) => {
  const value = Number(body.submissionId ?? body.rating_id)
  if (!Number.isSafeInteger(value) || value <= 0) {
    const error = new Error('Rating submission identifier is invalid.')
    error.status = 400
    throw error
  }
  return value
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

const populationScores = async () => records(await dataProvider.list(COLLECTIONS.ratings))
  .filter(isCompletedRating)
  .map((rating) => completedRatingTotal(rating.total_weighted))
  .filter((score) => score !== null)

const advancedFor = (rating, population, cellar = null) => buildAdvancedScore({
  score: completedRatingTotal(rating.total_weighted),
  population,
  retailPrice: cellar?.retail_price,
  purchasePrice: cellar?.purchase_price,
  volumeMl: cellar?.mls
})

const exactNamedRelationship = (record, id, nameField) => {
  if (!record || String(record.id ?? '') !== String(id ?? '')) return null
  const name = String(record[nameField] ?? '').trim()
  if (!name) return null
  return { id: record.id, [nameField]: name }
}

const productProjection = async (productId) => {
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product || String(product.id ?? '') !== String(productId)) return null

  const [producerRecord, categoryRecord] = await Promise.all([
    product.producer_id && String(product.producer_id) !== '0'
      ? dataProvider.get(COLLECTIONS.producers, product.producer_id)
      : Promise.resolve(null),
    product.product_category_id
      ? dataProvider.get(COLLECTIONS.categories, product.product_category_id)
      : Promise.resolve(null)
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

const submissionKey = (userId, submissionId) => `${userId}:${submissionId}`
const scoreKey = (key, attributeId) => `${key}:score:${attributeId}`
const bonusKey = (key, bonusId) => `${key}:bonus:${bonusId}`

const submissionFingerprint = (productId, cellarId, totals, bonusIds) => crypto
  .createHash('sha256')
  .update(JSON.stringify({
    productId: String(productId),
    cellarId,
    scores: totals.scores,
    weights: totals.weights,
    bonusIds: [...bonusIds].sort()
  }))
  .digest('hex')

const findSubmission = async (userId, submissionId) => records(await dataProvider.list(
  COLLECTIONS.ratings,
  { user_id: userId, rating_id: submissionId }
)).find((rating) => isOwnedBy(rating, userId) && Number(rating.rating_id) === submissionId) || null

const validateSubmissionChildren = async (rating, userId, expectedScores, expectedBonusIds, key) => {
  const [scoreRows, bonusRows] = await Promise.all([
    dataProvider.list(COLLECTIONS.ratingScores, { rating_id: rating.id, user_id: userId }),
    dataProvider.list(COLLECTIONS.bonusRatingMappings, { rating_id: rating.id, user_id: userId })
  ])
  const ownedScores = records(scoreRows).filter((item) => isOwnedBy(item, userId))
  const ownedBonuses = records(bonusRows).filter((item) => isOwnedBy(item, userId))
  const expectedScoreKeys = new Set(expectedScores.map((score) => scoreKey(key, score.attribute_id)))
  const expectedBonusKeys = new Set(expectedBonusIds.map((id) => bonusKey(key, id)))
  const expectedScoresByKey = new Map(expectedScores.map((score) => [scoreKey(key, score.attribute_id), score]))

  return {
    complete: ownedScores.length === expectedScoreKeys.size &&
      ownedBonuses.length === expectedBonusKeys.size &&
      ownedScores.every((item) => {
        const expected = expectedScoresByKey.get(item.uniqueness_key)
        return expected &&
          String(item.rating_id) === String(rating.id) &&
          String(item.attribute_id) === String(expected.attribute_id) &&
          String(item.attribute_score) === String(expected.attribute_score)
      }) &&
      ownedBonuses.every((item) => expectedBonusKeys.has(item.uniqueness_key) &&
        String(item.rating_id) === String(rating.id) &&
        item.uniqueness_key === bonusKey(key, item.bonus_attributes_id)),
    scoreKeys: new Set(ownedScores.map((item) => item.uniqueness_key)),
    bonusKeys: new Set(ownedBonuses.map((item) => item.uniqueness_key))
  }
}

const ratingIdentityMatches = (rating, userId, fingerprint) =>
  isOwnedBy(rating, userId) && rating?.submission_fingerprint === fingerprint

const transitionRating = async (rating, userId, fingerprint, fromStates, toState) => {
  const persisted = await dataProvider.get(COLLECTIONS.ratings, rating.id)
  if (!ratingIdentityMatches(persisted, userId, fingerprint)) {
    const error = new Error('The persisted rating no longer matches this submission.')
    error.status = 409
    throw error
  }
  if (persisted.submission_state === toState ||
      (toState === 'failed' && persisted.submission_state === 'complete')) return persisted
  if (!fromStates.has(persisted.submission_state)) {
    throw new Error('The rating workflow state cannot make that transition.')
  }

  const version = Number(persisted.submission_version)
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error('The rating workflow version is invalid.')
  }
  await dataProvider.compareAndSet(COLLECTIONS.ratings, persisted.id, version, {
    submission_state: toState,
    submission_version: version + 1
  })
  const transitioned = await dataProvider.get(COLLECTIONS.ratings, persisted.id)
  if (!ratingIdentityMatches(transitioned, userId, fingerprint) ||
      transitioned.submission_state !== toState || Number(transitioned.submission_version) !== version + 1) {
    throw new Error('Rating workflow state was not durably updated.')
  }
  return transitioned
}

const createChildIdempotently = async (collection, payload, loadExisting) => {
  try {
    const created = first(await dataProvider.create(collection, payload))
    if (!created?.id) throw new Error('The rating service did not return a child identifier.')
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    const existing = await loadExisting()
    const matchesExpected = existing && Object.entries(payload).every(([field, value]) =>
      String(existing[field] ?? '') === String(value ?? '')
    )
    if (!matchesExpected || !isOwnedBy(existing, payload.user_id)) throw error
  }
}

const submissionResponse = async ({
  response,
  status,
  rating,
  totals,
  requestedBonusIds,
  bonusPointTotal,
  bonusScore,
  duplicate,
  cellar
}) => {
  const saved = { ...rating, ...totals }
  const population = await populationScores()
  response.status(status).json({
    rating: { ...projectRating(saved), advanced_scores: advancedFor(saved, population, cellar) },
    scoreCount: totals.scores.length,
    bonusCount: requestedBonusIds.length,
    bonusPointTotal,
    bonusScore,
    duplicate
  })
}

const submitRating = async (request, response, user, correlationId) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const productId = positiveId(body.productId ?? body.product_id, 'Product identifier')
  const submissionId = submissionIdentifier(body)
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
  const derivedScores = scoresWithDerivedBonus(body.scores, attributes, bonusScore)
  const totals = calculateRatingTotals(derivedScores, records(attributes), body.weights)
  const cellar = await ownedCellarForRating(body, user.id, productId)
  const cellarId = cellar?.id ?? null
  const key = submissionKey(user.id, submissionId)
  const fingerprint = submissionFingerprint(productId, cellarId, totals, requestedBonusIds)
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
        rating = first(await dataProvider.create(COLLECTIONS.ratings, {
          user_id: user.id,
          rating_id: submissionId,
          submission_key: key,
          submission_fingerprint: fingerprint,
          submission_state: 'pending',
          submission_version: 0,
          expected_score_count: totals.scores.length,
          expected_bonus_count: requestedBonusIds.length,
          product_id: product.id,
          cellar_id: cellarId,
          date_rated: new Date().toISOString(),
          total_unweighted: totals.total_unweighted,
          total_weighted: totals.total_weighted
        }))
      } catch (error) {
        rating = await findSubmission(user.id, submissionId)
        if (!rating || (!dataProvider.isUniqueConflict(error) && error?.name !== 'TimeoutError')) throw error
        duplicate = true
      }
      if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
      if (!ratingIdentityMatches(rating, user.id, fingerprint)) {
        const conflict = new Error('The submission identifier is already used by different rating data.')
        conflict.status = 409
        throw conflict
      }
    }

    const existingChildren = await validateSubmissionChildren(
      rating, user.id, totals.scores, requestedBonusIds, key
    )

    for (const score of totals.scores) {
      const uniquenessKey = scoreKey(key, score.attribute_id)
      if (existingChildren.scoreKeys.has(uniquenessKey)) continue
      await createChildIdempotently(COLLECTIONS.ratingScores, {
        user_id: user.id,
        attribute_id: score.attribute_id,
        rating_id: rating.id,
        attribute_score: score.attribute_score,
        uniqueness_key: uniquenessKey
      }, async () => records(await dataProvider.list(COLLECTIONS.ratingScores, {
        user_id: user.id,
        uniqueness_key: uniquenessKey
      }))[0])
    }

    for (const bonusId of requestedBonusIds) {
      const uniquenessKey = bonusKey(key, bonusId)
      if (existingChildren.bonusKeys.has(uniquenessKey)) continue
      await createChildIdempotently(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id,
        rating_id: rating.id,
        bonus_attributes_id: bonusId,
        uniqueness_key: uniquenessKey
      }, async () => records(await dataProvider.list(COLLECTIONS.bonusRatingMappings, {
        user_id: user.id,
        uniqueness_key: uniquenessKey
      }))[0])
    }

    const completed = await validateSubmissionChildren(rating, user.id, totals.scores, requestedBonusIds, key)
    if (!completed.complete) throw new Error('Rating children remain incomplete after reconciliation.')
    rating = await transitionRating(rating, user.id, fingerprint, new Set(['pending', 'failed']), 'complete')

    await submissionResponse({
      response,
      status: duplicate ? 200 : 201,
      rating,
      totals,
      requestedBonusIds,
      bonusPointTotal,
      bonusScore,
      duplicate,
      cellar
    })
  } catch (error) {
    let stateUpdateFailed = false
    if (rating?.id) {
      try {
        const persisted = await dataProvider.get(COLLECTIONS.ratings, rating.id)
        if (ratingIdentityMatches(persisted, user.id, fingerprint) && isCompletedRating(persisted)) {
          const reconciled = await validateSubmissionChildren(
            persisted, user.id, totals.scores, requestedBonusIds, key
          )
          if (reconciled.complete) {
            await submissionResponse({
              response,
              status: 200,
              rating: persisted,
              totals,
              requestedBonusIds,
              bonusPointTotal,
              bonusScore,
              duplicate: true,
              cellar
            })
            return
          }
        }
        await transitionRating(rating, user.id, fingerprint, new Set(['pending']), 'failed')
      } catch {
        stateUpdateFailed = true
      }
    }

    writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action',
      method: 'POST',
      status_class: '5xx',
      event_name: stateUpdateFailed ? 'rating_reconciliation_state_update_failure' : 'rating_reconciliation_failure',
      correlation_id: correlationId
    }))
    if (error.status && error.status < 500) throw error
    const workflowError = new Error('Rating submission is incomplete and can be retried safely.')
    workflowError.status = 502
    throw workflowError
  }
}

const listUserRatings = async (response, user) => {
  const ownerRatings = records(await dataProvider.list(COLLECTIONS.ratings, {
    user_id: user.id,
    submission_state: 'complete'
  })).filter((rating) => isOwnedBy(rating, user.id) && isCompletedRating(rating))
  const [population, cellarRows] = await Promise.all([
    populationScores(),
    dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }).then(records)
  ])
  const cellarById = new Map(cellarRows
    .filter((item) => isOwnedBy(item, user.id))
    .map((item) => [String(item.id), item]))
  const productIds = [...new Set(ownerRatings
    .map((rating) => String(rating.product_id || ''))
    .filter((id) => /^[1-9]\d*$/.test(id)))]
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

const deleteRating = async (id, response, user) => {
  const ratingId = positiveId(id, 'Rating identifier')
  let rating = await dataProvider.get(COLLECTIONS.ratings, ratingId)
  if (!rating) {
    response.status(404).json({ error: 'Rating not found.' })
    return
  }
  if (!isOwnedBy(rating, user.id)) {
    response.status(403).json({ error: 'You are not authorised to delete this rating.' })
    return
  }
  if (rating.submission_state === 'deleted') {
    response.status(204).end()
    return
  }

  if (rating.submission_state !== 'deleting') {
    const version = Number(rating.submission_version)
    if (!Number.isSafeInteger(version) || version < 0) throw new Error('The rating workflow version is invalid.')
    try {
      await dataProvider.compareAndSet(COLLECTIONS.ratings, ratingId, version, {
        submission_state: 'deleting',
        submission_version: version + 1
      })
    } catch (error) {
      if (error?.code !== 'VERSION_CONFLICT') throw error
    }
    rating = await dataProvider.get(COLLECTIONS.ratings, ratingId)
    if (!isOwnedBy(rating, user.id)) {
      const error = new Error('The rating ownership changed during deletion.')
      error.status = 409
      throw error
    }
    if (rating.submission_state === 'deleted') {
      response.status(204).end()
      return
    }
    if (rating.submission_state !== 'deleting') {
      const error = new Error('The rating changed before deletion could start.')
      error.status = 409
      throw error
    }
  }

  const childCollections = [COLLECTIONS.ratingScores, COLLECTIONS.bonusRatingMappings]
  for (const collection of childCollections) {
    const children = records(await dataProvider.list(collection, { rating_id: ratingId, user_id: user.id }))
    for (const listedChild of children) {
      const child = await dataProvider.get(collection, listedChild.id)
      if (!isOwnedBy(child, user.id) || String(child.rating_id) !== String(ratingId)) continue
      try {
        await dataProvider.remove(collection, child.id)
      } catch (error) {
        if (error?.status !== 404) throw error
      }
    }
  }

  for (const collection of childCollections) {
    const remaining = records(await dataProvider.list(collection, { rating_id: ratingId, user_id: user.id }))
      .filter((child) => isOwnedBy(child, user.id) && String(child.rating_id) === String(ratingId))
    if (remaining.length) throw new Error('Rating deletion reconciliation remains incomplete.')
  }

  const persisted = await dataProvider.get(COLLECTIONS.ratings, ratingId)
  if (!isOwnedBy(persisted, user.id)) throw new Error('The rating ownership changed during deletion.')
  if (persisted.submission_state !== 'deleted') {
    const version = Number(persisted.submission_version)
    if (persisted.submission_state !== 'deleting' || !Number.isSafeInteger(version) || version < 0) {
      throw new Error('The rating deletion workflow state is invalid.')
    }
    try {
      await dataProvider.compareAndSet(COLLECTIONS.ratings, ratingId, version, {
        submission_state: 'deleted',
        submission_version: version + 1,
        deleted_at: new Date().toISOString()
      })
    } catch (error) {
      if (error?.code !== 'VERSION_CONFLICT') throw error
      const reconciled = await dataProvider.get(COLLECTIONS.ratings, ratingId)
      if (!isOwnedBy(reconciled, user.id) || reconciled.submission_state !== 'deleted') throw error
    }
  }
  response.status(204).end()
}

export const routeRatingRequest = async (request, response, user, correlationId) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'ratings') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }
  if (request.method === 'POST' && id === 'submit') return submitRating(request, response, user, correlationId)
  if (request.method === 'POST' && id === 'reconcile') return submitRating(request, response, user, correlationId)
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

export const __testables = {
  routeRatingRequest,
  submitRating,
  listUserRatings,
  deleteRating,
  advancedFor,
  productProjection,
  populationScores,
  findSubmission,
  validateSubmissionChildren,
  transitionRating,
  submissionFingerprint,
  isCompletedRating,
  scoresWithDerivedBonus
}
