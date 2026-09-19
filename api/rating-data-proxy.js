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

const canonicalPositiveId = (value) => {
  const text = String(value ?? '').trim()
  const number = Number(text)
  return Number.isSafeInteger(number) && number > 0 && String(number) === text ? text : null
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
  return Object.freeze({ overall, styleIndex: buildStyleScoreIndex({ ratings: ratingRows, products: productRows, categories: categoryRows }) })
}

const populationScores = async () => (await scorePopulations()).overall
const advancedFor = (rating, populations, cellar = null) => ({
  ...buildAdvancedScore({ score: completedRatingTotal(rating.total_weighted), population: populations?.overall || [], retailPrice: cellar?.retail_price, purchasePrice: cellar?.purchase_price, volumeMl: cellar?.mls }),
  ...styleScaledScoreForRating(rating, populations?.styleIndex)
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
    product.producer_id && String(product.producer_id) !== '0' ? dataProvider.get(COLLECTIONS.producers, product.producer_id) : Promise.resolve(null),
    product.product_category_id ? dataProvider.get(COLLECTIONS.categories, product.product_category_id) : Promise.resolve(null)
  ])
  return { id: product.id, product_name: String(product.product_name || '').trim(), product_category_id: product.product_category_id ?? null, producer_id: product.producer_id ?? null, producer: exactNamedRelationship(producerRecord, product.producer_id, 'producer_name'), category: exactNamedRelationship(categoryRecord, product.product_category_id, 'category_name') }
}

const submissionKey = (userId, submissionId) => `${userId}:${submissionId}`
const submissionFingerprint = (productId, cellarId, totals, bonusIds) => crypto.createHash('sha256').update(JSON.stringify({ productId: String(productId), cellarId, scores: totals.scores, weights: totals.weights, bonusIds: [...bonusIds].sort() })).digest('hex')

const findSubmission = async (userId, submissionId) => {
  const key = submissionKey(userId, submissionId)
  return records(await dataProvider.list(COLLECTIONS.ratings, { user_id: userId, submission_key: key }))
    .find((rating) => isOwnedBy(rating, userId) && rating.submission_key === key) || null
}

const summariseSubmissionChildren = (rating, userId, expectedScores, expectedBonusIds, scoreRows, bonusRows) => {
  const ownedScores = records(scoreRows).filter((item) => isOwnedBy(item, userId) && String(item.rating_id) === String(rating.id))
  const ownedBonuses = records(bonusRows).filter((item) => isOwnedBy(item, userId) && String(item.rating_id) === String(rating.id))
  const expectedScoresByAttribute = new Map(expectedScores.map((score) => [String(score.attribute_id), score]))
  const expectedBonusIdsSet = new Set(expectedBonusIds.map(String))
  const matchingScoreAttributes = new Set(ownedScores.filter((item) => {
    const expected = expectedScoresByAttribute.get(String(item.attribute_id))
    return expected && Number.isFinite(Number(item.attribute_score)) && Number(item.attribute_score) === Number(expected.attribute_score)
  }).map((item) => String(item.attribute_id)))
  const matchingBonusIds = new Set(ownedBonuses.filter((item) => expectedBonusIdsSet.has(String(item.bonus_attribute_id))).map((item) => String(item.bonus_attribute_id)))
  return {
    complete: ownedScores.length === expectedScoresByAttribute.size && ownedBonuses.length === expectedBonusIdsSet.size &&
      ownedScores.every((item) => {
        const expected = expectedScoresByAttribute.get(String(item.attribute_id))
        return expected && Number.isFinite(Number(item.attribute_score)) && Number(item.attribute_score) === Number(expected.attribute_score)
      }) &&
      ownedBonuses.every((item) => expectedBonusIdsSet.has(String(item.bonus_attribute_id))),
    scoreAttributes: matchingScoreAttributes,
    bonusIds: matchingBonusIds,
    scores: ownedScores,
    bonuses: ownedBonuses
  }
}

const validateSubmissionChildren = async (rating, userId, expectedScores, expectedBonusIds) => {
  const [scoreRows, bonusRows] = await Promise.all([
    dataProvider.list(COLLECTIONS.ratingScores, { rating_id: rating.id, user_id: userId }),
    dataProvider.list(COLLECTIONS.bonusRatingMappings, { rating_id: rating.id, user_id: userId })
  ])
  return summariseSubmissionChildren(rating, userId, expectedScores, expectedBonusIds, scoreRows, bonusRows)
}

const ratingIdentityMatches = (rating, userId, fingerprint) => isOwnedBy(rating, userId) && rating?.submission_fingerprint === fingerprint
const RATING_STATE_VERIFY_DELAYS_MS = [0, 100, 250, 500, 1000]
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const verifyRatingState = async (ratingId, userId, fingerprint, state, version) => {
  for (const delay of RATING_STATE_VERIFY_DELAYS_MS) {
    if (delay) await wait(delay)
    const current = await dataProvider.get(COLLECTIONS.ratings, ratingId)
    if (!ratingIdentityMatches(current, userId, fingerprint)) {
      if (current) { const error = new Error('The persisted rating no longer matches this submission.'); error.status = 409; throw error }
      continue
    }
    if (current.submission_state === state && Number(current.submission_version) === version) return current
  }
  throw new Error('Rating workflow state was not durably updated.')
}

const transitionRating = async (rating, userId, fingerprint, fromStates, toState) => {
  const persisted = await dataProvider.get(COLLECTIONS.ratings, rating.id)
  if (!ratingIdentityMatches(persisted, userId, fingerprint)) { const error = new Error('The persisted rating no longer matches this submission.'); error.status = 409; throw error }
  if (persisted.submission_state === toState || (toState === 'failed' && persisted.submission_state === 'complete')) return persisted
  if (!fromStates.has(persisted.submission_state)) throw new Error('The rating workflow state cannot make that transition.')
  const version = Number(persisted.submission_version)
  if (!Number.isSafeInteger(version) || version < 0) throw new Error('The rating workflow version is invalid.')
  const updateResult = first(await dataProvider.update(COLLECTIONS.ratings, persisted.id, { submission_state: toState, submission_version: version + 1 }))
  if (updateResult && String(updateResult.id ?? persisted.id) === String(persisted.id) &&
      updateResult.submission_state === toState && Number(updateResult.submission_version) === version + 1) {
    return { ...persisted, ...updateResult }
  }
  try {
    return await verifyRatingState(persisted.id, userId, fingerprint, toState, version + 1)
  } catch (error) {
    error.stateTransitionAcknowledged = true
    error.targetState = toState
    throw error
  }
}

const childFieldMatches = (field, actual, expected) => field === 'attribute_score'
  ? Number.isFinite(Number(actual)) && Number(actual) === Number(expected)
  : String(actual ?? '') === String(expected ?? '')

const childMatchesExpected = (child, payload) =>
  child && isOwnedBy(child, payload.user_id) &&
  Object.entries(payload).every(([field, value]) => childFieldMatches(field, child[field], value))

const createChildIdempotently = async (collection, payload, loadExisting) => {
  try {
    const created = first(await dataProvider.create(collection, payload))
    if (!created?.id) throw new Error('The rating service did not return a child identifier.')
    const persisted = await dataProvider.get(collection, created.id)
    if (!childMatchesExpected(persisted, payload)) {
      throw new Error('The persisted rating child could not be verified after creation.')
    }
    return persisted
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    const existing = await loadExisting()
    if (!childMatchesExpected(existing, payload)) throw error
    return existing
  }
}

const submissionResponse = async ({ response, status, rating, totals, requestedBonusIds, bonusPointTotal, bonusScore, duplicate, cellar }) => {
  const saved = { ...rating, ...totals }
  let advancedScores = null
  try {
    advancedScores = advancedFor(saved, await scorePopulations(), cellar)
  } catch {
    // Persistence is authoritative. Population analytics can be recomputed on a later read.
  }
  response.status(status).json({ rating: { ...projectRating(saved), advanced_scores: advancedScores }, scoreCount: totals.scores.length, bonusCount: requestedBonusIds.length, bonusPointTotal, bonusScore, duplicate })
}

const providerDateTime = (date = new Date()) => date.toISOString().slice(0, 19).replace('T', ' ')

const runAutomaticRatingCreateDiagnostic = async ({ user, product, cellarId }) => {
  const values = [
    ['user_id', user.id],
    ['product_id', product.id],
    ['date_rated', providerDateTime()],
    ['total_unweighted', 1],
    ['total_weighted', 1],
    ['submission_key', `diagnostic:${user.id}:${crypto.randomUUID()}`],
    ['submission_fingerprint', crypto.createHash('sha256').update(`diagnostic:${user.id}:${product.id}`).digest('hex')],
    ['submission_state', 'pending'],
    ['submission_version', 0],
    ['expected_score_count', 1],
    ['expected_bonus_count', 0],
    ...(cellarId === null ? [] : [['cellar_id', cellarId]])
  ]
  const stages = []
  for (let index = 0; index < values.length; index += 1) {
    const payload = Object.fromEntries(values.slice(0, index + 1))
    let created
    try {
      created = first(await dataProvider.create(COLLECTIONS.ratings, payload))
    } catch (error) {
      stages.push({ stage: index + 1, added_field: values[index][0], outcome: 'failed', provider_status: error?.providerStatus ?? error?.status ?? null })
      continue
    }
    if (!created?.id) {
      stages.push({ stage: index + 1, added_field: values[index][0], outcome: 'missing_id' })
      continue
    }
    await dataProvider.remove(COLLECTIONS.ratings, created.id)
    const remaining = await dataProvider.get(COLLECTIONS.ratings, created.id)
    if (remaining) throw new Error('Automatic rating diagnostic cleanup could not be verified.')
    stages.push({ stage: index + 1, added_field: values[index][0], outcome: 'passed' })
  }
  return stages
}

const submitRating = async (request, response, user, correlationId) => {
  const atStage = async (stage, operation) => {
    try { return await operation() }
    catch (error) { error.workflowStage = stage; throw error }
  }
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const productId = positiveId(body.productId ?? body.product_id, 'Product identifier')
  const submissionId = submissionIdentifier(body)
  const [product, attributes, bonusCatalogue] = await atStage('load_rating_dependencies', () => Promise.all([dataProvider.get(COLLECTIONS.products, productId), dataProvider.list(COLLECTIONS.ratingAttributes), loadBonusCatalogue(user.id)]))
  if (!product || String(product.id ?? '') !== productId) { response.status(404).json({ error: 'Product not found.' }); return }
  const requestedBonusIds = validateBonusIds(body.bonusAttributeIds, bonusCatalogue.bonusAttributes)
  const bonusPointTotal = selectedBonusPointTotal(bonusCatalogue.bonusAttributes, requestedBonusIds)
  const bonusScore = bonusScoreFromPoints(bonusPointTotal)
  const derivedScores = scoresWithDerivedBonus(body.scores, attributes, bonusScore)
  const totals = calculateRatingTotals(derivedScores, records(attributes), body.weights)
  const cellar = await atStage('validate_cellar', () => ownedCellarForRating(body, user.id, productId))
  const cellarId = cellar?.id ?? null
  const key = submissionKey(user.id, submissionId)
  const fingerprint = submissionFingerprint(productId, cellarId, totals, requestedBonusIds)
  let workflowStage = 'find_existing_submission'
  let rating = await findSubmission(user.id, submissionId)
  let duplicate = Boolean(rating)
  if (rating && rating.submission_fingerprint !== fingerprint) { const error = new Error('The submission identifier is already used by different rating data.'); error.status = 409; throw error }
  try {
    if (!rating) {
      try {
        workflowStage = 'create_rating_parent'
        const parentPayload = {
          user_id: user.id, submission_key: key, submission_fingerprint: fingerprint, submission_state: 'pending', submission_version: 0,
          expected_score_count: totals.scores.length, expected_bonus_count: requestedBonusIds.length, product_id: product.id,
          date_rated: providerDateTime(), total_unweighted: totals.total_unweighted, total_weighted: totals.total_weighted,
          ...(cellarId === null ? {} : { cellar_id: cellarId })
        }
        rating = first(await dataProvider.create(COLLECTIONS.ratings, parentPayload))
        if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
        workflowStage = 'hydrate_rating_parent'
        rating = await dataProvider.get(COLLECTIONS.ratings, rating.id)
      } catch (error) {
        rating = await findSubmission(user.id, submissionId)
        if (!rating || (!dataProvider.isUniqueConflict(error) && error?.name !== 'TimeoutError')) throw error
        duplicate = true
      }
      if (!rating?.id) throw new Error('The rating service did not return a rating identifier.')
      if (!ratingIdentityMatches(rating, user.id, fingerprint)) { const conflict = new Error('The submission identifier is already used by different rating data.'); conflict.status = 409; throw conflict }
    }
    if (duplicate && isCompletedRating(rating)) {
      workflowStage = 'build_response'
      await submissionResponse({ response, status: 200, rating, totals, requestedBonusIds, bonusPointTotal, bonusScore, duplicate: true, cellar })
      return
    }

    workflowStage = 'load_existing_children'
    const existingChildren = await validateSubmissionChildren(rating, user.id, totals.scores, requestedBonusIds)
    const verifiedScores = [...existingChildren.scores]
    const verifiedBonuses = [...existingChildren.bonuses]
    for (const score of totals.scores) {
      const attributeId = String(score.attribute_id)
      if (existingChildren.scoreAttributes.has(attributeId)) continue
      workflowStage = 'create_score_child'
      const persistedChild = await createChildIdempotently(COLLECTIONS.ratingScores, { user_id: user.id, attribute_id: score.attribute_id, rating_id: rating.id, attribute_score: score.attribute_score }, async () => records(await dataProvider.list(COLLECTIONS.ratingScores, { user_id: user.id, rating_id: rating.id, attribute_id: score.attribute_id }))[0])
      verifiedScores.push(persistedChild)
    }
    for (const bonusId of requestedBonusIds) {
      if (existingChildren.bonusIds.has(String(bonusId))) continue
      workflowStage = 'create_bonus_child'
      const persistedChild = await createChildIdempotently(COLLECTIONS.bonusRatingMappings, { user_id: user.id, rating_id: rating.id, bonus_attribute_id: bonusId }, async () => records(await dataProvider.list(COLLECTIONS.bonusRatingMappings, { user_id: user.id, rating_id: rating.id, bonus_attribute_id: bonusId }))[0])
      verifiedBonuses.push(persistedChild)
    }
    workflowStage = 'reconcile_children'
    const completed = summariseSubmissionChildren(rating, user.id, totals.scores, requestedBonusIds, verifiedScores, verifiedBonuses)
    if (!completed.complete) {
      if (process.env.VERCEL_ENV === 'preview') {
        const expectedScoreIds = totals.scores.map((score) => String(score.attribute_id)).sort()
        const matchedScoreIds = [...completed.scoreAttributes].sort()
        const expectedBonusIds = requestedBonusIds.map(String).sort()
        const matchedBonusIds = [...completed.bonusIds].sort()
        const [diagnosticScores, diagnosticBonuses] = await Promise.all([
          dataProvider.list(COLLECTIONS.ratingScores, { rating_id: rating.id, user_id: user.id }),
          dataProvider.list(COLLECTIONS.bonusRatingMappings, { rating_id: rating.id, user_id: user.id })
        ])
        console.error('[rating-reconciliation-diagnostic]', JSON.stringify({
          correlation_id: correlationId,
          expected_score_count: expectedScoreIds.length,
          returned_score_count: records(diagnosticScores).length,
          matched_score_count: matchedScoreIds.length,
          returned_score_attribute_ids: records(diagnosticScores).map((item) => String(item?.attribute_id ?? '')).sort(),
          missing_score_attribute_ids: expectedScoreIds.filter((id) => !completed.scoreAttributes.has(id)),
          expected_bonus_count: expectedBonusIds.length,
          returned_bonus_count: records(diagnosticBonuses).length,
          matched_bonus_count: matchedBonusIds.length,
          returned_bonus_attribute_ids: records(diagnosticBonuses).map((item) => String(item?.bonus_attribute_id ?? '')).sort(),
          missing_bonus_attribute_ids: expectedBonusIds.filter((id) => !completed.bonusIds.has(id))
        }))
      }
      throw new Error('Rating children remain incomplete after reconciliation.')
    }
    workflowStage = 'mark_complete'
    rating = await transitionRating(rating, user.id, fingerprint, new Set(['pending', 'failed']), 'complete')
    workflowStage = 'build_response'
    await submissionResponse({ response, status: duplicate ? 200 : 201, rating, totals, requestedBonusIds, bonusPointTotal, bonusScore, duplicate, cellar })
  } catch (error) {
    if (workflowStage === 'create_rating_parent' && process.env.VERCEL_ENV === 'preview') {
      try {
        const stages = await runAutomaticRatingCreateDiagnostic({ user, product, cellarId })
        console.error('[rating-create-diagnostic]', JSON.stringify({ correlation_id: correlationId, stages }))
      } catch (diagnosticError) {
        console.error('[rating-create-diagnostic]', JSON.stringify({ correlation_id: correlationId, outcome: 'diagnostic_failed', error_name: diagnosticError?.name || 'Error' }))
      }
    }
    let stateUpdateFailed = false
    if (rating?.id) {
      try {
        const persisted = await dataProvider.get(COLLECTIONS.ratings, rating.id)
        if (ratingIdentityMatches(persisted, user.id, fingerprint) && isCompletedRating(persisted)) {
          const reconciled = await validateSubmissionChildren(persisted, user.id, totals.scores, requestedBonusIds, key)
          if (reconciled.complete) { await submissionResponse({ response, status: 200, rating: persisted, totals, requestedBonusIds, bonusPointTotal, bonusScore, duplicate: true, cellar }); return }
        }
        if (!(workflowStage === 'mark_complete' && error?.stateTransitionAcknowledged)) {
          await transitionRating(rating, user.id, fingerprint, new Set(['pending']), 'failed')
        }
      } catch (stateError) {
        stateUpdateFailed = true
        if (process.env.VERCEL_ENV === 'preview') {
          console.error('[rating-workflow-diagnostic]', JSON.stringify({
            correlation_id: correlationId,
            failed_stage: workflowStage,
            recovery_stage: 'mark_failed',
            recovery_provider_status: stateError?.providerStatus ?? stateError?.status ?? null,
            recovery_provider_operation: stateError?.providerOperation ?? null,
            recovery_provider_error_kind: stateError?.providerErrorKind ?? null
          }))
        }
      }
    }
    const diagnosticEvents = { create_rating_parent: 'rating_parent_create_failure', hydrate_rating_parent: 'rating_parent_hydrate_failure', load_existing_children: 'rating_child_read_failure', create_score_child: 'rating_score_create_failure', create_bonus_child: 'rating_bonus_create_failure', reconcile_children: 'rating_child_mismatch', mark_complete: 'rating_state_transition_failure', build_response: 'rating_response_build_failure' }
    writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/ratings/:action',
      method: 'POST',
      status_class: '5xx',
      event_name: diagnosticEvents[workflowStage] || (stateUpdateFailed ? 'rating_reconciliation_state_update_failure' : 'rating_reconciliation_failure'),
      correlation_id: correlationId,
      provider_status: Number.isInteger(error?.providerStatus) ? String(error.providerStatus) : undefined,
      provider_operation: error?.providerOperation,
      provider_error_kind: error?.providerErrorKind,
      provider_request_shape: error?.providerRequestShape
    }))
    if (error.status && error.status < 500) throw error
    const workflowError = new Error('Rating submission is incomplete and can be retried safely.'); workflowError.status = 502; throw workflowError
  }
}

const HISTORICAL_RATING_PAGE_SIZE = 100
const HISTORICAL_RATING_MAX_PAGES = 1000

const historicalOwnerRecords = async (collection, userId) => {
  const ownerRecords = []
  for (let page = 1; page <= HISTORICAL_RATING_MAX_PAGES; page += 1) {
    const payload = await dataProvider.listPage(collection, {
      page,
      limit: HISTORICAL_RATING_PAGE_SIZE,
      orderBy: 'id',
      order: 'asc',
      filters: { user_id: userId }
    })
    const pageItems = records(payload.items)
    ownerRecords.push(...pageItems.filter((record) => isOwnedBy(record, userId)))

    if (payload.totalPages === 0 || page >= payload.totalPages || pageItems.length < HISTORICAL_RATING_PAGE_SIZE) {
      return ownerRecords
    }
  }
  throw new Error('Historical rating reconciliation exceeded the safe pagination limit.')
}

const groupHistoricalChildren = (children) => {
  const grouped = new Map()
  for (const child of children) {
    const ratingId = String(child.rating_id ?? '')
    if (!ratingId) continue
    if (!grouped.has(ratingId)) grouped.set(ratingId, [])
    grouped.get(ratingId).push(child)
  }
  return grouped
}

const historicalReconciliationPlan = async (user) => {
  const [allRatings, allScores, allBonuses] = await Promise.all([
    historicalOwnerRecords(COLLECTIONS.ratings, user.id),
    historicalOwnerRecords(COLLECTIONS.ratingScores, user.id),
    historicalOwnerRecords(COLLECTIONS.bonusRatingMappings, user.id)
  ])
  const ownerRatings = allRatings.filter((rating) => rating.submission_state !== 'deleted')
  const scoresByRating = groupHistoricalChildren(allScores)
  const bonusesByRating = groupHistoricalChildren(allBonuses)
  const items = []

  for (const rating of ownerRatings) {
    const ownedScores = (scoresByRating.get(String(rating.id)) || [])
      .filter((item) => String(item.rating_id) === String(rating.id))
    const ownedBonuses = (bonusesByRating.get(String(rating.id)) || [])
      .filter((item) => String(item.rating_id) === String(rating.id))
    const scoreAttributeIds = ownedScores.map((item) => canonicalPositiveId(item.attribute_id)).filter(Boolean)
    const uniqueScoreAttributes = new Set(scoreAttributeIds)
    const validScores = ownedScores.length > 0 && scoreAttributeIds.length === ownedScores.length &&
      uniqueScoreAttributes.size === ownedScores.length &&
      ownedScores.every((item) => Number.isFinite(Number(item.attribute_score)))
    const bonusAttributeIds = ownedBonuses.map((item) => canonicalPositiveId(item.bonus_attribute_id)).filter(Boolean)
    const validBonuses = bonusAttributeIds.length === ownedBonuses.length && new Set(bonusAttributeIds).size === ownedBonuses.length
    const legacyCandidate = !String(rating.submission_key ?? '').trim() &&
      !String(rating.submission_fingerprint ?? '').trim()
    const structurallyValid = legacyCandidate && validScores && validBonuses
    const legacyKey = `legacy:${user.id}:${rating.id}`
    const legacyFingerprint = crypto.createHash('sha256').update(JSON.stringify({
      ratingId: String(rating.id),
      productId: String(rating.product_id ?? ''),
      scoreAttributes: [...uniqueScoreAttributes].sort(),
      bonusAttributes: [...bonusAttributeIds].sort()
    })).digest('hex')
    items.push({
      ratingId: rating.id,
      currentState: rating.submission_state ?? null,
      legacyCandidate,
      structurallyValid,
      scoreCount: ownedScores.length,
      bonusCount: ownedBonuses.length,
      proposed: structurallyValid ? {
        submission_key: legacyKey,
        submission_fingerprint: legacyFingerprint,
        submission_state: 'complete',
        expected_score_count: ownedScores.length,
        expected_bonus_count: ownedBonuses.length
      } : null
    })
  }
  return items
}

const reconcileHistoricalRatings = async (request, response, user) => {
  const dryRun = request.body?.apply !== true
  const items = await historicalReconciliationPlan(user)
  if (!dryRun) {
    for (const item of items) {
      if (!item.structurallyValid || !item.proposed) continue
      const persisted = await dataProvider.get(COLLECTIONS.ratings, item.ratingId)
      if (!isOwnedBy(persisted, user.id) || persisted.submission_state === 'deleted') continue
      const version = Number(persisted.submission_version)
      await dataProvider.update(COLLECTIONS.ratings, item.ratingId, {
        ...item.proposed,
        submission_version: Number.isSafeInteger(version) && version >= 0 ? version + 1 : 1
      })
      const verified = await dataProvider.get(COLLECTIONS.ratings, item.ratingId)
      if (!isOwnedBy(verified, user.id) || verified.submission_state !== 'complete' ||
          Number(verified.expected_score_count) !== item.scoreCount ||
          Number(verified.expected_bonus_count) !== item.bonusCount) {
        throw new Error('Historical rating reconciliation was not durably verified.')
      }
    }
  }
  response.status(200).json({
    dryRun,
    examined: items.length,
    eligible: items.filter((item) => item.structurallyValid).length,
    items
  })
}

const listUserRatings = async (response, user) => {
  const ownerRatings = records(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id, submission_state: 'complete' })).filter((rating) => isOwnedBy(rating, user.id) && isCompletedRating(rating))
  const [populations, cellarRows] = await Promise.all([scorePopulations(), dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }).then(records)])
  const cellarById = new Map(cellarRows.filter((item) => isOwnedBy(item, user.id)).map((item) => [String(item.id), item]))
  const productIds = [...new Set(ownerRatings.map((rating) => String(rating.product_id || '')).filter((id) => /^[1-9]\d*$/.test(id)))]
  const products = await Promise.all(productIds.map(async (id) => [id, await productProjection(id)]))
  const productsById = new Map(products)
  response.status(200).json({ items: ownerRatings.map((rating) => ({ ...projectRating(rating), advanced_scores: advancedFor(rating, populations, cellarById.get(String(rating.cellar_id)) || null), product: productsById.get(String(rating.product_id)) || null })).sort((left, right) => String(right.date_rated || '').localeCompare(String(left.date_rated || ''))) })
}

const diagnosticRatingCreate = async (request, response, user) => {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    const error = new Error('Rating create diagnostics are unavailable in production.')
    error.status = 404
    throw error
  }

  const productId = positiveId(request.body?.productId ?? request.body?.product_id, 'Product identifier')
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product?.id) {
    const error = new Error('Product not found.')
    error.status = 404
    throw error
  }

  const cellarId = request.body?.cellarId ?? request.body?.cellar_id
  const values = [
    ['user_id', user.id],
    ['product_id', product.id],
    ['date_rated', providerDateTime()],
    ['total_unweighted', 1],
    ['total_weighted', 1],
    ['submission_key', `diagnostic:${user.id}:${crypto.randomUUID()}`],
    ['submission_fingerprint', crypto.createHash('sha256').update(`diagnostic:${user.id}:${product.id}`).digest('hex')],
    ['submission_state', 'pending'],
    ['submission_version', 0],
    ['expected_score_count', 1],
    ['expected_bonus_count', 0]
  ]

  if (cellarId !== undefined && cellarId !== null && cellarId !== '') {
    const cellar = await dataProvider.get(COLLECTIONS.cellar, positiveId(cellarId, 'Cellar identifier'))
    if (!isOwnedBy(cellar, user.id) || String(cellar.product_id) !== String(product.id)) {
      const error = new Error('The cellar record is not available for this diagnostic.')
      error.status = 403
      throw error
    }
    values.push(['cellar_id', cellar.id])
  }

  const results = []
  for (let index = 0; index < values.length; index += 1) {
    const stage = index + 1
    const payload = Object.fromEntries(values.slice(0, stage))
    let created
    try {
      created = first(await dataProvider.create(COLLECTIONS.ratings, payload))
    } catch (error) {
      results.push({
        stage,
        added_field: values[index][0],
        outcome: 'create_failed',
        provider_status: error?.providerStatus ?? error?.status ?? null,
        provider_error_kind: error?.providerErrorKind ?? null,
        provider_request_shape: error?.providerRequestShape ?? null
      })
      continue
    }

    if (!created?.id) throw new Error('Diagnostic rating create did not return an identifier.')
    const createdId = created.id
    const persisted = await dataProvider.get(COLLECTIONS.ratings, createdId)
    if (!isOwnedBy(persisted, user.id)) throw new Error('Diagnostic rating create could not be verified.')

    await dataProvider.remove(COLLECTIONS.ratings, createdId)
    const afterDelete = await dataProvider.get(COLLECTIONS.ratings, createdId)
    if (afterDelete) throw new Error('Diagnostic rating cleanup could not be verified; stop staged testing.')

    results.push({ stage, added_field: values[index][0], outcome: 'success_cleaned' })
  }

  const firstSuccess = results.findIndex((item) => item.outcome === 'success_cleaned')
  const firstRegression = firstSuccess < 0
    ? null
    : results.slice(firstSuccess + 1).find((item) => item.outcome === 'create_failed') || null

  response.status(200).json({
    outcome: firstRegression ? 'regression_found' : firstSuccess < 0 ? 'no_valid_payload_found' : 'completed',
    first_failing_field: firstRegression?.added_field || null,
    stages: results
  })
}

const deleteRating = async (id, response, user) => {
  const ratingId = positiveId(id, 'Rating identifier')
  let rating = await dataProvider.get(COLLECTIONS.ratings, ratingId)
  if (!rating) { response.status(404).json({ error: 'Rating not found.' }); return }
  if (!isOwnedBy(rating, user.id)) { response.status(403).json({ error: 'You are not authorised to delete this rating.' }); return }
  if (rating.submission_state === 'deleted') { response.status(204).end(); return }
  if (rating.submission_state !== 'deleting') {
    const version = Number(rating.submission_version)
    if (!Number.isSafeInteger(version) || version < 0) throw new Error('The rating workflow version is invalid.')
    await dataProvider.update(COLLECTIONS.ratings, ratingId, { submission_state: 'deleting', submission_version: version + 1 })
    rating = await dataProvider.get(COLLECTIONS.ratings, ratingId)
    if (!isOwnedBy(rating, user.id)) { const error = new Error('The rating ownership changed during deletion.'); error.status = 409; throw error }
    if (rating.submission_state === 'deleted') { response.status(204).end(); return }
    if (rating.submission_state !== 'deleting') { const error = new Error('The rating changed before deletion could start.'); error.status = 409; throw error }
  }
  const childCollections = [COLLECTIONS.ratingScores, COLLECTIONS.bonusRatingMappings]
  for (const collection of childCollections) {
    const children = records(await dataProvider.list(collection, { rating_id: ratingId, user_id: user.id }))
    for (const listedChild of children) {
      const child = await dataProvider.get(collection, listedChild.id)
      if (!isOwnedBy(child, user.id) || String(child.rating_id) !== String(ratingId)) continue
      try { await dataProvider.remove(collection, child.id) } catch (error) { if (error?.status !== 404) throw error }
    }
  }
  for (const collection of childCollections) {
    const remaining = records(await dataProvider.list(collection, { rating_id: ratingId, user_id: user.id })).filter((child) => isOwnedBy(child, user.id) && String(child.rating_id) === String(ratingId))
    if (remaining.length) throw new Error('Rating deletion reconciliation remains incomplete.')
  }
  const persisted = await dataProvider.get(COLLECTIONS.ratings, ratingId)
  if (!isOwnedBy(persisted, user.id)) throw new Error('The rating ownership changed during deletion.')
  if (persisted.submission_state !== 'deleted') {
    const version = Number(persisted.submission_version)
    if (persisted.submission_state !== 'deleting' || !Number.isSafeInteger(version) || version < 0) throw new Error('The rating deletion workflow state is invalid.')
    await dataProvider.update(COLLECTIONS.ratings, ratingId, { submission_state: 'deleted', submission_version: version + 1, deleted_at: new Date().toISOString() })
    const reconciled = await dataProvider.get(COLLECTIONS.ratings, ratingId)
    if (!isOwnedBy(reconciled, user.id) || reconciled.submission_state !== 'deleted' || Number(reconciled.submission_version) !== version + 1) throw new Error('Rating deletion state was not durably updated.')
  }
  response.status(204).end()
}

export const routeRatingRequest = async (request, response, user, correlationId) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'ratings') { response.status(404).json({ error: 'Application data route not found.' }); return }
  if (request.method === 'POST' && id === 'submit') return submitRating(request, response, user, correlationId)
  if (request.method === 'POST' && id === 'reconcile') return reconcileHistoricalRatings(request, response, user)
  if (request.method === 'POST' && id === 'create-diagnostic') {
    if (process.env.VERCEL_ENV !== 'preview') {
      response.status(404).json({ error: 'Application data route not found.' })
      return
    }
    return diagnosticRatingCreate(request, response, user)
  }
  if (request.method === 'GET' && id === 'mine') return listUserRatings(response, user)
  if (request.method === 'DELETE' && id && !action) return deleteRating(id, response, user)
  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (!ALLOWED_METHODS.has(request.method)) { response.setHeader('Allow', [...ALLOWED_METHODS].join(', ')); response.status(405).json({ error: 'Method not allowed.' }); return }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, { key: request.method === 'GET' ? 'data-read' : 'data-write', limit: request.method === 'GET' ? 240 : 60 })) return
  try { const user = await requireSessionUser(request); await routeRatingRequest(request, response, user, correlationId) }
  catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) writeTelemetryError(runtimeTelemetry({ route_template: '/api/nocodebackend/ratings/:action', method: request.method, status_class: `${Math.floor(status / 100)}xx`, event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure', correlation_id: correlationId, workflow_stage: error.workflowStage, error_name: error?.name || 'Error', error_code: error?.code || error?.status || 'unknown' }))
    response.status(status).json(error.payload || { error: status < 500 && error.message ? error.message : safeErrorMessage(status), code: error.code, requestId: correlationId })
  }
}

export const __testables = { routeRatingRequest, submitRating, listUserRatings, deleteRating, advancedFor, productProjection, scorePopulations, populationScores, findSubmission, validateSubmissionChildren, summariseSubmissionChildren, transitionRating, verifyRatingState, submissionFingerprint, isCompletedRating, scoresWithDerivedBonus, historicalOwnerRecords, historicalReconciliationPlan, reconcileHistoricalRatings, diagnosticRatingCreate }
