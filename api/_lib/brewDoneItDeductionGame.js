import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'
import {
  BREW_DONE_IT_DEDUCTION_DIMENSIONS,
  projectBrewDoneItDeduction,
  sanitiseBrewDoneItDeductionInput
} from './brewDoneItPolicy.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const first = (value) => list(value)[0] || value || null
const fail = (message, status = 400, code = null) => Object.assign(new Error(message), { status, ...(code ? { code } : {}) })
const id = (value, label) => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) throw fail(`${label} is invalid.`)
  return text
}
const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .filter((value) => value !== null && value !== undefined)
  .some((value) => String(value) === String(userId))

const requestKey = (request, userId) => {
  const key = String(request.body?.idempotencyKey || '').trim()
  if (!/^[A-Za-z0-9:_-]{8,180}$/.test(key)) throw fail('The idempotency key is invalid.')
  return `${userId}:${key}`
}

const idempotencyConflict = () => fail(
  'This request key has already been used for a different Brew Done It deduction.',
  409,
  'IDEMPOTENCY_CONFLICT'
)

const roundAndGame = async (roundId, user) => {
  const round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, id(roundId, 'Round identifier'))
  if (!round) throw fail('Round not found.', 404)
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, round.game_id)
  if (!game || !participant(game, user.id)) throw fail('Round not found.', 404)
  return { round, game }
}

const activeGuesser = async (roundId, user) => {
  const result = await roundAndGame(roundId, user)
  if (String(result.round.guesser_participant_id) !== String(user.id)) {
    throw fail('Only the guesser can update the deduction board.', 403)
  }
  if (result.game.status !== 'active' || result.round.status !== 'guessing') {
    throw fail('This round is not accepting deduction changes.', 409)
  }
  return result
}

const weightedValue = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 1 && number <= 7 ? number : null
}

const booleanOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (value === true || value === 1 || value === '1') return true
  if (value === false || value === 0 || value === '0') return false
  return null
}

const average = (ratings) => {
  const values = ratings.map((rating) => weightedValue(rating.total_weighted)).filter((value) => value !== null)
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null
}

const latestRatedAt = (ratings) => ratings.reduce((latest, rating) => {
  const candidate = rating.date_rated
  const timestamp = Date.parse(candidate || '')
  if (!Number.isFinite(timestamp)) return latest
  if (!latest) return candidate
  return timestamp > Date.parse(latest) ? candidate : latest
}, null)

const aggregate = (ratings, productsById, predicate) => {
  const matching = ratings.filter((rating) => {
    const product = productsById.get(String(rating.product_id))
    return product && predicate(product)
  })
  return {
    ratingCount: matching.length,
    distinctBeerCount: new Set(matching.map((rating) => String(rating.product_id))).size,
    averageWeighted: average(matching),
    lastRatedAt: latestRatedAt(matching)
  }
}

const sharingEnabled = (game, guesserId) => String(game.creator_participant_id) === String(guesserId)
  ? game.creator_history_clues_enabled === true || Number(game.creator_history_clues_enabled) === 1
  : game.opponent_history_clues_enabled === true || Number(game.opponent_history_clues_enabled) === 1

const deductionLogicalKey = (deduction) => [
  deduction.dimension,
  deduction.reference_id ?? deduction.referenceId ?? '',
  deduction.value_text ?? deduction.valueText ?? '',
  deduction.numeric_value ?? deduction.numericValue ?? ''
].map((value) => String(value ?? '')).join('|')

const sameDeductionRequest = (stored, input) => {
  if (stored.dimension !== input.dimension || stored.answer !== input.answer) return false
  if (String(stored.reference_id ?? '') !== String(input.referenceId ?? '')) return false
  if (String(stored.numeric_value ?? '') !== String(input.numericValue ?? '')) return false
  if ([BREW_DONE_IT_DEDUCTION_DIMENSIONS.breweryCountry, BREW_DONE_IT_DEDUCTION_DIMENSIONS.breweryState].includes(input.dimension)) {
    return String(stored.value_text ?? '') === String(input.valueText ?? '')
  }
  // Style display labels are server-canonicalized and therefore are not part of
  // the caller's idempotency identity; the category reference is authoritative.
  return true
}

const deductionTimestamp = (deduction) => {
  const timestamp = Date.parse(deduction.updated_at || deduction.created_at || '')
  return Number.isFinite(timestamp) ? timestamp : 0
}

const canonicalDeductions = (records) => {
  const canonical = new Map()
  for (const deduction of list(records)) {
    const key = deductionLogicalKey(deduction)
    const current = canonical.get(key)
    if (!current) {
      canonical.set(key, deduction)
      continue
    }
    const nextTime = deductionTimestamp(deduction)
    const currentTime = deductionTimestamp(current)
    if (nextTime > currentTime || (nextTime === currentTime && String(deduction.id ?? '') > String(current.id ?? ''))) {
      canonical.set(key, deduction)
    }
  }
  return [...canonical.values()].sort((a, b) => {
    const timeDifference = deductionTimestamp(a) - deductionTimestamp(b)
    return timeDifference || String(a.id ?? '').localeCompare(String(b.id ?? ''))
  })
}

const resolveDeductionInput = async (input) => {
  const dimensions = BREW_DONE_IT_DEDUCTION_DIMENSIONS
  if ([dimensions.breweryCountry, dimensions.breweryState].includes(input.dimension)) {
    throw fail('Brewery geography deductions are not available until canonical geography is certified.', 409)
  }

  if (input.dimension === dimensions.style) {
    const category = await dataProvider.get(COLLECTIONS.categories, input.referenceId)
    if (!category) throw fail('Style not found.', 404)
    return { ...input, valueText: category.category_name || null }
  }

  if (input.dimension === dimensions.breweryRuledOut) {
    const producer = await dataProvider.get(COLLECTIONS.producers, input.referenceId)
    if (!producer) throw fail('Brewery not found.', 404)
  }

  if (input.dimension === dimensions.beerRuledOut) {
    const product = await dataProvider.get(COLLECTIONS.products, input.referenceId)
    if (!product) throw fail('Beer not found.', 404)
  }

  return input
}

const findDeductionByRequestKey = async (roundId, key) => list(await dataProvider.list(COLLECTIONS.brewDoneItDeductions, {
  round_id: roundId,
  idempotency_key: key
}))[0] || null

const persistDeductionEvent = async (round, user, key, input) => {
  const now = new Date().toISOString()
  const body = {
    round_id: round.id,
    recorded_by_participant_id: user.id,
    dimension: input.dimension,
    answer: input.answer,
    value_text: input.valueText,
    reference_id: input.referenceId,
    numeric_value: input.numericValue,
    created_at: now,
    updated_at: now,
    idempotency_key: key
  }

  try {
    return first(await dataProvider.create(COLLECTIONS.brewDoneItDeductions, body))
  } catch (error) {
    const persisted = await findDeductionByRequestKey(round.id, key)
    if (!persisted) throw error
    if (!sameDeductionRequest(persisted, input)) throw idempotencyConflict()
    return persisted
  }
}

export const getSelectorClues = async (roundId, response, user) => {
  const { round, game } = await roundAndGame(roundId, user)
  if (String(round.selector_participant_id) !== String(user.id)) {
    throw fail('Only the selector can view the secret clue sheet.', 403)
  }

  const product = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!product) throw fail('The selected product cannot be resolved.', 409)

  const [producer, category] = await Promise.all([
    product.producer_id ? dataProvider.get(COLLECTIONS.producers, product.producer_id).catch(() => null) : null,
    product.product_category_id ? dataProvider.get(COLLECTIONS.categories, product.product_category_id).catch(() => null) : null
  ])

  let history = { enabled: false }
  if (sharingEnabled(game, round.guesser_participant_id)) {
    const [ratings, products] = await Promise.all([
      dataProvider.list(COLLECTIONS.ratings, { user_id: round.guesser_participant_id }),
      dataProvider.list(COLLECTIONS.products)
    ])
    const cleanRatings = list(ratings)
    const productsById = new Map(list(products).map((item) => [String(item.id), item]))
    history = {
      enabled: true,
      exactBeer: aggregate(cleanRatings, productsById, (item) => String(item.id) === String(product.id)),
      brewery: aggregate(cleanRatings, productsById, (item) => String(item.producer_id) === String(product.producer_id)),
      style: aggregate(cleanRatings, productsById, (item) => String(item.product_category_id) === String(product.product_category_id))
    }
  }

  response.status(200).json({
    brewery: {
      id: producer?.id ?? product.producer_id ?? null,
      name: producer?.producer_name || null,
      // Geography intentionally remains unknown until a governed canonical source exists.
      suburb: null,
      postcode: null,
      state: null,
      stateAcronym: null,
      country: null
    },
    beer: {
      id: product.id,
      name: product.product_name,
      abv: product.abv ?? null,
      ibu: product.ibu ?? null,
      declaredCategory: product.declared_category || null,
      edition: product.edition || null,
      collaboration: booleanOrNull(product.collaboration)
    },
    style: {
      id: category?.id ?? product.product_category_id ?? null,
      name: category?.category_name || product.declared_category || null
    },
    traits: {
      dark: 'unknown',
      barrelAged: 'unknown'
    },
    capabilities: {
      geography: false,
      structuredDarkTrait: false,
      structuredBarrelAgedTrait: false,
      historyAggregates: history.enabled
    },
    history
  })
}

export const listDeductions = async (roundId, response, user) => {
  await activeGuesser(roundId, user)
  const deductions = canonicalDeductions(await dataProvider.list(COLLECTIONS.brewDoneItDeductions, { round_id: roundId }))
    .map(projectBrewDoneItDeduction)
  response.status(200).json({ deductions })
}

export const recordDeduction = async (roundId, request, response, user) => {
  const { round } = await activeGuesser(roundId, user)
  const key = requestKey(request, user.id)
  let input = sanitiseBrewDoneItDeductionInput(request.body)
  const replay = await findDeductionByRequestKey(round.id, key)
  if (replay) {
    if (!sameDeductionRequest(replay, input)) throw idempotencyConflict()
    response.status(200).json({ deduction: projectBrewDoneItDeduction(replay), replayed: true })
    return
  }

  input = await resolveDeductionInput(input)
  const saved = await persistDeductionEvent(round, user, key, input)
  response.status(201).json({ deduction: projectBrewDoneItDeduction(saved) })
}

export const __testables = {
  aggregate,
  sharingEnabled,
  weightedValue,
  booleanOrNull,
  latestRatedAt,
  deductionLogicalKey,
  sameDeductionRequest,
  canonicalDeductions
}