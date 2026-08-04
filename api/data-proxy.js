import crypto from 'node:crypto'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'
import { COLLECTIONS } from '../src/data/contract.js'
import { calculateRatingTotals } from '../src/utils/ratingSubmission.js'
import { BREW_DONE_IT_RULES, calculateBrewDoneItScore } from '../src/utils/brewDoneItScoring.js'
import { requireSessionUser } from './_lib/authSession.js'
import { dataProvider } from './_lib/dataProvider.js'
import {
  BONUS_FIELDS,
  CATEGORY_FIELDS,
  PRODUCER_FIELDS,
  PRODUCT_FIELDS,
  PROFILE_FIELDS,
  RATING_FIELDS,
  projectBrewDoneItGame,
  projectBrewDoneItGuess,
  projectBrewDoneItRound,
  isOwnedBy,
  projectAttribute,
  projectBonus,
  projectProduct,
  projectProfile,
  projectRating,
  sanitiseCellarInput,
  sanitiseBrewDoneItGuessInput,
  sanitiseBrewDoneItJoinInput,
  sanitiseBrewDoneItSelectionInput,
  sanitiseProfileUpdates
} from './_lib/dataPolicy.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from './_lib/httpSecurity.js'

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
const isCompletedRating = (rating) => rating?.submission_state === 'complete'

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
    submission_state: 'complete',
    fields: 'total_weighted,submission_state'
  })).filter(isCompletedRating)
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
    // Launch catalogue details expose aggregates, not individual rating records.
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
  const expectedScoresByKey = new Map(expectedScores.map((score) => [
    scoreKey(key, score.attribute_id),
    score
  ]))
  return {
    complete: ownedScores.length === expectedScoreKeys.size && ownedBonuses.length === expectedBonusKeys.size &&
      ownedScores.every((item) => {
        const expected = expectedScoresByKey.get(item.uniqueness_key)
        return expected && String(item.rating_id) === String(rating.id) &&
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
          submission_version: 0,
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
    rating = await transitionRating(rating, user.id, fingerprint, new Set(['pending', 'failed']), 'complete')

    response.status(duplicate ? 200 : 201).json({
      rating: projectRating({ ...rating, ...totals }),
      scoreCount: totals.scores.length,
      bonusCount: requestedBonusIds.length,
      duplicate
    })
  } catch (error) {
    let stateUpdateFailed = false
    if (rating?.id) {
      try {
        const persisted = await dataProvider.get(COLLECTIONS.ratings, rating.id)
        if (ratingIdentityMatches(persisted, user.id, fingerprint) && persisted.submission_state === 'complete') {
          const reconciled = await validateSubmissionChildren(
            persisted, user.id, totals.scores, requestedBonusIds, key
          )
          if (reconciled.complete) {
            response.status(200).json({
              rating: projectRating({ ...persisted, ...totals }),
              scoreCount: totals.scores.length,
              bonusCount: requestedBonusIds.length,
              duplicate: true
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
      route_template: '/api/nocodebackend/ratings/:action', method: 'POST', status_class: '5xx',
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
  const ratings = normaliseList(await dataProvider.list(COLLECTIONS.ratings, { user_id: user.id }))
    .filter((rating) => isOwnedBy(rating, user.id) && isCompletedRating(rating))
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
  if (updates.product_id !== undefined) {
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

const brewDoneItError = (message, status = 403) => Object.assign(new Error(message), { status })
const participant = (game, userId) => [game?.selector_participant_id, game?.guesser_participant_id]
  .some((id) => id !== null && id !== undefined && String(id) === String(userId))
const inviteDigest = (code) => crypto.createHash('sha256').update(code).digest('hex')
const HISTORY_PREDICATES = Object.freeze({
  both_rated_product: 'both_rated_product',
  both_rated_producer: 'both_rated_producer',
  both_rated_style: 'both_rated_style',
  current_player_rated_product: 'current_player_rated_product'
})
const MAX_HISTORY_QUESTIONS_PER_ROUND = 2
const INVITATION_LIFETIME_MS = 24 * 60 * 60 * 1000
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/

const transitionInput = (request) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const expectedVersion = Number(body.expectedVersion)
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw brewDoneItError('The expected version is invalid.', 400)
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) throw brewDoneItError('The idempotency key is invalid.', 400)
  return { expectedVersion, idempotencyKey }
}

const versionConflict = (record) => {
  const error = brewDoneItError('The game changed before this request was applied.', 409)
  error.payload = { error: error.message, code: 'VERSION_CONFLICT', currentVersion: Number(record?.version || 0) }
  return error
}

const assertVersion = (record, expectedVersion) => {
  if (Number(record?.version || 0) !== expectedVersion) throw versionConflict(record)
}

const compareAndSet = async (collection, record, expectedVersion, updates) => {
  try {
    await dataProvider.compareAndSet(collection, record.id, expectedVersion, { ...updates, version: expectedVersion + 1 })
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    throw versionConflict(await dataProvider.get(collection, record.id))
  }
  const persisted = await dataProvider.get(collection, record.id)
  if (Number(persisted?.version) !== expectedVersion + 1) throw versionConflict(persisted)
  return persisted
}

const requireHistoryConsent = (body) => {
  if (!body || body.historyConsent !== true) {
    throw brewDoneItError('Explicit shared-history consent is required.', 400)
  }
}

const getBrewDoneItGame = async (gameId, user) => {
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, parsePositiveId(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw brewDoneItError('Game not found.', 404)
  return game
}

const getBrewDoneItRound = async (roundId, user) => {
  const round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, parsePositiveId(roundId, 'Round identifier'))
  if (!round) throw brewDoneItError('Round not found.', 404)
  const game = await getBrewDoneItGame(round.game_id, user)
  if (String(round.selector_participant_id) !== String(game.selector_participant_id) ||
      String(round.guesser_participant_id) !== String(game.guesser_participant_id)) {
    throw brewDoneItError('Round participant relationship is invalid.', 409)
  }
  return { round, game }
}

const ensureInitialBrewDoneItRound = async (game, joinedAt) => {
  const [existing] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, {
    game_id: game.id, round_number: 1
  }))
  if (existing) return existing
  try {
    return firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItRounds, {
      game_id: game.id, round_number: 1,
      selector_participant_id: game.selector_participant_id,
      guesser_participant_id: game.guesser_participant_id,
      selected_product_id: null, status: 'awaiting_selection', turn_sequence: 0,
      max_turns: BREW_DONE_IT_RULES.maxGuesses, question_count: 0,
      created_at: joinedAt, started_at: null, completed_at: null, completion_reason: null, version: 0
    }))
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    const [persisted] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, {
      game_id: game.id, round_number: 1
    }))
    if (!persisted) throw error
    return persisted
  }
}

const createBrewDoneItGame = async (request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  if (expectedVersion !== 0) throw versionConflict({ version: 0 })
  requireHistoryConsent(request.body)
  const now = new Date().toISOString()
  const creationKey = `${user.id}:${idempotencyKey}`
  const signingKey = process.env.BREW_DONE_IT_INVITATION_KEY || process.env.NOCODEBACKEND_SECRET_KEY
  if (!signingKey) throw brewDoneItError('The game invitation service is not configured.', 503)
  const invitationCode = crypto.createHmac('sha256', signingKey).update(creationKey).digest('base64url')
  const [existing] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGames, {
    creation_idempotency_key: creationKey
  }))
  if (existing && String(existing.selector_participant_id) === String(user.id)) {
    response.status(200).json({ game: projectBrewDoneItGame(existing), invitationCode, replayed: true })
    return
  }
  const game = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItGames, {
    selector_participant_id: user.id,
    guesser_participant_id: null,
    invitation_digest: inviteDigest(invitationCode),
    status: 'waiting',
    version: 0, creation_idempotency_key: creationKey,
    expires_at: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
    selector_history_consent_at: now,
    guesser_history_consent_at: null,
    created_at: now,
    joined_at: null,
    completed_at: null
  }))
  response.status(201).json({ game: projectBrewDoneItGame(game), invitationCode })
}

const joinBrewDoneItGame = async (gameId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  requireHistoryConsent(request.body)
  const id = parsePositiveId(gameId, 'Game identifier')
  const { inviteCode } = sanitiseBrewDoneItJoinInput(request.body)
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, id)
  if (game?.join_idempotency_key === `${user.id}:${idempotencyKey}` && participant(game, user.id)) {
    const round = await ensureInitialBrewDoneItRound(game, game.joined_at)
    response.status(200).json({ game: projectBrewDoneItGame(game), round: projectBrewDoneItRound(round, user.id), replayed: true })
    return
  }
  if (!game || game.invitation_digest !== inviteDigest(inviteCode)) throw brewDoneItError('Game invitation is invalid.', 404)
  assertVersion(game, expectedVersion)
  if (Date.parse(game.expires_at) <= Date.now()) throw brewDoneItError('Game invitation has expired.', 409)
  if (game.status !== 'waiting' || game.guesser_participant_id) throw brewDoneItError('Game invitation is no longer available.', 409)
  if (String(game.selector_participant_id) === String(user.id)) throw brewDoneItError('The selector cannot join as the guesser.', 409)
  const joinedAt = new Date().toISOString()
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItGames, game, expectedVersion, {
    guesser_participant_id: user.id, status: 'active', joined_at: joinedAt,
    guesser_history_consent_at: joinedAt, invitation_digest: null,
    join_idempotency_key: `${user.id}:${idempotencyKey}`
  })
  if (String(persisted?.guesser_participant_id) !== String(user.id) || persisted?.status !== 'active') {
    throw brewDoneItError('Game invitation was claimed by another participant.', 409)
  }
  const round = await ensureInitialBrewDoneItRound(persisted, joinedAt)
  response.status(200).json({ game: projectBrewDoneItGame(persisted), round: projectBrewDoneItRound(round, user.id) })
}

const activeRatingMatches = (rating, userId, cutoff, product, predicate) => {
  if (!isOwnedBy(rating, userId) || !isCompletedRating(rating) || rating.deleted_at) return false
  const ratedAt = Date.parse(rating.date_rated)
  if (!Number.isFinite(ratedAt) || ratedAt >= cutoff) return false
  if (predicate.endsWith('_product')) return String(rating.product_id) === String(product.id)
  return true
}

const resolveBrewDoneItHistoryQuestion = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { round, game } = await getBrewDoneItRound(roundId, user)
  const requestKey = `${user.id}:${idempotencyKey}`
  const [replayed] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItHistoryQuestions, {
    round_id: round.id, idempotency_key: requestKey
  }))
  if (replayed) {
    response.status(200).json({ predicate: replayed.predicate, answer: Boolean(replayed.answer), version: Number(round.version), replayed: true })
    return
  }
  assertVersion(round, expectedVersion)
  if (game.status !== 'active' || round.status !== 'guessing' || !round.selected_product_id) {
    throw brewDoneItError('Shared-history questions are available only during an active round.', 409)
  }
  if (!game.selector_history_consent_at || !game.guesser_history_consent_at) {
    throw brewDoneItError('Both participants must consent to shared-history questions.')
  }
  const body = request.body && typeof request.body === 'object' ? request.body : {}
  const allowedFields = new Set(['predicate', 'expectedVersion', 'idempotencyKey'])
  if (Object.keys(body).some((field) => !allowedFields.has(field)) || !Object.hasOwn(HISTORY_PREDICATES, body.predicate)) {
    throw brewDoneItError('The history predicate is not allowed.', 400)
  }
  const existing = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItHistoryQuestions, { round_id: round.id }))
  if (existing.length >= MAX_HISTORY_QUESTIONS_PER_ROUND) throw brewDoneItError('This round has no remaining shared-history questions.', 409)
  if (existing.some((question) => question.predicate === body.predicate)) throw brewDoneItError('This shared-history question has already been asked.', 409)

  const participantIds = [game.selector_participant_id, game.guesser_participant_id]
  const blocks = normaliseList(await dataProvider.list(COLLECTIONS.blockedRelationships))
  const participantKeys = participantIds.map(String)
  if (blocks.some((block) => participantKeys.includes(String(block.blocker_user_id)) && participantKeys.includes(String(block.blocked_user_id)))) {
    throw brewDoneItError('Shared-history questions are unavailable for these participants.')
  }
  const product = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!product) throw brewDoneItError('The selected product cannot be resolved.', 409)
  const cutoff = Date.parse(round.started_at)
  if (!Number.isFinite(cutoff)) throw brewDoneItError('The round history boundary is invalid.', 409)
  const ratings = normaliseList(await dataProvider.list(COLLECTIONS.ratings))
  const ratedProducts = new Map()
  for (const participantId of participantIds) {
    const owned = ratings.filter((rating) => activeRatingMatches(rating, participantId, cutoff, product, body.predicate))
    if (body.predicate === HISTORY_PREDICATES.both_rated_producer || body.predicate === HISTORY_PREDICATES.both_rated_style) {
      const products = await Promise.all(owned.map((rating) => dataProvider.get(COLLECTIONS.products, rating.product_id)))
      ratedProducts.set(participantId, products.some((ratedProduct) => ratedProduct && String(
        body.predicate === HISTORY_PREDICATES.both_rated_producer ? ratedProduct.producer_id : ratedProduct.product_category_id
      ) === String(body.predicate === HISTORY_PREDICATES.both_rated_producer ? product.producer_id : product.product_category_id)))
    } else ratedProducts.set(participantId, owned.length > 0)
  }
  const answer = body.predicate === HISTORY_PREDICATES.current_player_rated_product
    ? [...ratedProducts].find(([id]) => String(id) === String(user.id))?.[1] === true
    : participantIds.every((id) => ratedProducts.get(id) === true)
  try {
    await dataProvider.create(COLLECTIONS.brewDoneItHistoryQuestions, {
      round_id: round.id, predicate: body.predicate, question_sequence: existing.length + 1,
      uniqueness_key: `${round.id}:${body.predicate}`, asked_by_participant_id: user.id,
      answer, answered_at: new Date().toISOString(), idempotency_key: requestKey
    })
  } catch (error) {
    if (dataProvider.isUniqueConflict(error)) throw brewDoneItError('This shared-history question has already been asked.', 409)
    throw error
  }
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, { question_count: existing.length + 1 })
  response.status(200).json({ predicate: body.predicate, answer, version: Number(persisted.version) })
}

const transitionBrewDoneItGame = async (gameId, action, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const game = await getBrewDoneItGame(gameId, user)
  const requestKey = `${user.id}:${idempotencyKey}`
  if (game.terminal_idempotency_key === requestKey) {
    response.status(200).json({ game: projectBrewDoneItGame(game), replayed: true }); return
  }
  assertVersion(game, expectedVersion)
  const now = new Date().toISOString()
  if (action === 'cancel') {
    if (game.status !== 'waiting' || String(game.selector_participant_id) !== String(user.id)) {
      throw brewDoneItError('Only the selector can cancel a waiting invitation.', 409)
    }
  } else if (action === 'expire') {
    if (game.status !== 'waiting' || Date.parse(game.expires_at) > Date.now()) {
      throw brewDoneItError('This invitation is not eligible for expiry.', 409)
    }
  } else if (action === 'forfeit') {
    if (game.status !== 'active') throw brewDoneItError('Only an active game can be forfeited.', 409)
  } else throw brewDoneItError('Game transition not found.', 404)

  const status = action === 'cancel' ? 'cancelled' : action === 'expire' ? 'expired' : 'forfeited'
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItGames, game, expectedVersion, {
    status, completion_reason: action, completed_at: now,
    ...(action === 'cancel' ? { cancelled_at: now } : {}), terminal_idempotency_key: requestKey
  })
  const rounds = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
  const activeRound = rounds.find((round) => ['awaiting_selection', 'guessing'].includes(round.status))
  if (activeRound) await compareAndSet(COLLECTIONS.brewDoneItRounds, activeRound, Number(activeRound.version || 0), {
    status, completion_reason: action, completed_at: now, awarded_points: 0
  })
  response.status(200).json({ game: projectBrewDoneItGame(persisted) })
}

const selectBrewDoneItProduct = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { round } = await getBrewDoneItRound(roundId, user)
  const requestKey = `${user.id}:${idempotencyKey}`
  if (round.selection_idempotency_key === requestKey) {
    response.status(200).json({ round: projectBrewDoneItRound(round, user.id), replayed: true })
    return
  }
  assertVersion(round, expectedVersion)
  if (String(round.selector_participant_id) !== String(user.id)) throw brewDoneItError('Only the selector can choose the beer.')
  if (round.status !== 'awaiting_selection' || round.selected_product_id) throw brewDoneItError('This round cannot be changed.', 409)
  const { productId } = sanitiseBrewDoneItSelectionInput(request.body)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw brewDoneItError('Product not found.', 404)
  const startedAt = new Date().toISOString()
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    selected_product_id: productId, status: 'guessing', started_at: startedAt,
    selection_idempotency_key: requestKey
  })
  response.status(200).json({ round: projectBrewDoneItRound(persisted, user.id) })
}

const submitBrewDoneItGuess = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { round, game } = await getBrewDoneItRound(roundId, user)
  const requestKey = `${user.id}:${idempotencyKey}`
  const [replayedGuess] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, {
    round_id: round.id, idempotency_key: requestKey
  }))
  if (replayedGuess) {
    if (round.status === 'completed' && game.status === 'active') {
      await compareAndSet(COLLECTIONS.brewDoneItGames, game, Number(game.version || 0), {
        status: 'completed', completed_at: round.completed_at, completion_reason: round.completion_reason
      })
    }
    response.status(200).json({
      guess: projectBrewDoneItGuess(replayedGuess), round: projectBrewDoneItRound(round, user.id), replayed: true
    })
    return
  }
  assertVersion(round, expectedVersion)
  if (String(round.guesser_participant_id) !== String(user.id)) throw brewDoneItError('Only the designated guesser can submit a guess.')
  if (round.status !== 'guessing' || !round.selected_product_id) throw brewDoneItError('This round is not accepting guesses.', 409)
  const guess = sanitiseBrewDoneItGuessInput(request.body)
  const guessCollection = guess.guessType === 'product'
    ? COLLECTIONS.products
    : guess.guessType === 'producer' ? COLLECTIONS.producers : COLLECTIONS.categories
  if (!await dataProvider.get(guessCollection, guess.guessId)) throw brewDoneItError('Guess reference not found.', 404)
  const targetProduct = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!targetProduct?.producer_id || !targetProduct?.product_category_id) {
    throw brewDoneItError('The selected product cannot be scored.', 409)
  }
  const previous = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id }))
    .sort((left, right) => Number(left.turn_sequence) - Number(right.turn_sequence))
  if (previous.some((item) => item.guess_type === guess.guessType && String(item.guessed_reference_id ?? item.guessed_product_id) === String(guess.guessId))) {
    throw brewDoneItError('This guess has already been submitted.', 409)
  }
  const turnSequence = Number(round.turn_sequence) + 1
  if (!Number.isSafeInteger(turnSequence) || turnSequence > Number(round.max_turns)) throw brewDoneItError('This round has no remaining turns.', 409)
  const categories = normaliseList(await dataProvider.list(COLLECTIONS.categories))
  const styleParentById = Object.fromEntries(categories.map((category) => [String(category.id), category.parent_id ?? null]))
  const score = calculateBrewDoneItScore({
    target: {
      productId: targetProduct.id,
      producerId: targetProduct.producer_id,
      styleId: targetProduct.product_category_id
    },
    guesses: [...previous.map((item) => ({
      type: item.guess_type,
      id: item.guessed_reference_id ?? item.guessed_product_id
    })), { type: guess.guessType, id: guess.guessId }],
    questionCount: Number(round.question_count || 0),
    styleParentById
  })
  const currentItem = score.items.at(-1)
  const correct = guess.guessType === 'product' && currentItem.outcome === 'exact'
  const completed = correct || turnSequence === Number(round.max_turns)
  const completionReason = correct ? 'correct_guess' : completed ? 'turn_limit' : null
  const awardedPoints = currentItem.points
  let created
  try {
    created = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItGuesses, {
      round_id: round.id, guesser_participant_id: user.id, turn_sequence: turnSequence,
      uniqueness_key: `${round.id}:${turnSequence}`, guess_type: guess.guessType,
      guessed_reference_id: guess.guessId, is_correct: correct, awarded_points: awardedPoints,
      created_at: new Date().toISOString(), idempotency_key: requestKey
    }))
  } catch (error) {
    if (dataProvider.isUniqueConflict(error)) throw brewDoneItError('This turn has already been submitted.', 409)
    throw error
  }
  const completedAt = completed ? new Date().toISOString() : null
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    turn_sequence: turnSequence, status: completed ? 'completed' : 'guessing',
    completed_at: completedAt, completion_reason: completionReason,
    ...(completed ? {
      scoring_rules_version: score.version,
      awarded_points: score.total,
      score_breakdown: { ...score.breakdown, items: score.items }
    } : {})
  })
  if (completed && game.status === 'active') await compareAndSet(COLLECTIONS.brewDoneItGames, game, Number(game.version || 0), {
    status: 'completed', completed_at: completedAt, completion_reason: completionReason
  })
  if (Number(persisted?.turn_sequence) !== turnSequence || (completed && (
    persisted?.status !== 'completed' || persisted?.scoring_rules_version !== score.version ||
    Number(persisted?.awarded_points) !== score.total || !persisted?.score_breakdown
  ))) {
    throw brewDoneItError('The turn could not be confirmed.', 409)
  }
  response.status(201).json({ guess: projectBrewDoneItGuess(created), round: projectBrewDoneItRound(persisted, user.id) })
}

const showBrewDoneItGame = async (gameId, response, user) => {
  const game = await getBrewDoneItGame(gameId, user)
  const rounds = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
    .filter((round) => String(round.selector_participant_id) === String(game.selector_participant_id) &&
      String(round.guesser_participant_id) === String(game.guesser_participant_id))
  response.status(200).json({ game: projectBrewDoneItGame(game), rounds: rounds.map((round) => projectBrewDoneItRound(round, user.id)) })
}

const brewDoneItStats = async (response, user) => {
  const games = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGames))
    .filter((game) => participant(game, user.id) && game.status === 'completed')
  const rounds = (await Promise.all(games.map((game) => dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id })))).flat()
    .filter((round) => round.status === 'completed' && participant(round, user.id))
  const points = rounds.reduce((total, round) => total + Number(round.awarded_points || 0), 0)
  response.status(200).json({ completedGames: games.length, completedRounds: rounds.length, awardedPoints: points })
}

const routeRequest = async (request, response, user, correlationId) => {
  const segments = pathSegments(request)
  const [resource, id, action] = segments

  if (resource === 'brew-done-it' && process.env.BREW_DONE_IT_POLICY_ENABLED !== 'true') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }
  if (resource === 'brew-done-it' && id === 'games' && !action && request.method === 'POST') return createBrewDoneItGame(request, response, user)
  if (resource === 'brew-done-it' && id === 'games' && action && segments[3] === 'join' && request.method === 'POST') return joinBrewDoneItGame(action, request, response, user)
  if (resource === 'brew-done-it' && id === 'games' && action && ['cancel', 'expire', 'forfeit'].includes(segments[3]) && request.method === 'POST') {
    return transitionBrewDoneItGame(action, segments[3], request, response, user)
  }
  if (resource === 'brew-done-it' && id === 'games' && action && !segments[3] && request.method === 'GET') return showBrewDoneItGame(action, response, user)
  if (resource === 'brew-done-it' && id === 'rounds' && action && segments[3] === 'selection' && request.method === 'POST') return selectBrewDoneItProduct(action, request, response, user)
  if (resource === 'brew-done-it' && id === 'rounds' && action && segments[3] === 'guesses' && request.method === 'POST') return submitBrewDoneItGuess(action, request, response, user)
  if (resource === 'brew-done-it' && id === 'rounds' && action && segments[3] === 'history-questions' && request.method === 'POST') {
    if (!enforceRateLimit(request, response, { key: `history-question:${action}`, limit: 6, windowMs: 60_000 })) return
    return resolveBrewDoneItHistoryQuestion(action, request, response, user)
  }
  if (resource === 'brew-done-it' && id === 'stats' && !action && request.method === 'GET') return brewDoneItStats(response, user)

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
        route_template: '/api/nocodebackend/:resource', method: request.method,
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
  findProfile,
  getProduct,
  getProfile,
  updateProfile,
  updateCellar,
  submitRating,
  listUserRatings,
  createBrewDoneItGame, joinBrewDoneItGame, selectBrewDoneItProduct, submitBrewDoneItGuess,
  showBrewDoneItGame, brewDoneItStats, resolveBrewDoneItHistoryQuestion, transitionBrewDoneItGame,
  HISTORY_PREDICATES, MAX_HISTORY_QUESTIONS_PER_ROUND
}
