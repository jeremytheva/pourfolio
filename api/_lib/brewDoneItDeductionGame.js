import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'
import { projectBrewDoneItDeduction, sanitiseBrewDoneItDeductionInput } from './brewDoneItPolicy.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const first = (value) => list(value)[0] || value || null
const fail = (message, status = 400) => Object.assign(new Error(message), { status })
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

const average = (ratings) => {
  const values = ratings.map((rating) => Number(rating.total_weighted)).filter(Number.isFinite)
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null
}

const aggregate = (ratings, productsById, predicate) => {
  const matching = ratings.filter((rating) => {
    const product = productsById.get(String(rating.product_id))
    return product && predicate(product)
  })
  return {
    ratingCount: matching.length,
    distinctBeerCount: new Set(matching.map((rating) => String(rating.product_id))).size,
    averageWeighted: average(matching),
    lastRatedAt: matching.reduce((latest, rating) => {
      const candidate = rating.date_rated
      if (!candidate) return latest
      return !latest || Date.parse(candidate) > Date.parse(latest) ? candidate : latest
    }, null)
  }
}

const sharingEnabled = (game, guesserId) => String(game.creator_participant_id) === String(guesserId)
  ? game.creator_history_clues_enabled === true || Number(game.creator_history_clues_enabled) === 1
  : game.opponent_history_clues_enabled === true || Number(game.opponent_history_clues_enabled) === 1

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
      collaboration: product.collaboration === true || Number(product.collaboration) === 1
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
  const deductions = list(await dataProvider.list(COLLECTIONS.brewDoneItDeductions, { round_id: roundId }))
    .sort((a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0))
    .map(projectBrewDoneItDeduction)
  response.status(200).json({ deductions })
}

export const recordDeduction = async (roundId, request, response, user) => {
  const { round } = await activeGuesser(roundId, user)
  const key = requestKey(request, user.id)
  const input = sanitiseBrewDoneItDeductionInput(request.body)
  const replay = list(await dataProvider.list(COLLECTIONS.brewDoneItDeductions, {
    round_id: round.id,
    idempotency_key: key
  }))[0]
  if (replay) {
    response.status(200).json({ deduction: projectBrewDoneItDeduction(replay), replayed: true })
    return
  }

  const existing = list(await dataProvider.list(COLLECTIONS.brewDoneItDeductions, { round_id: round.id })).find((item) =>
    item.dimension === input.dimension &&
    String(item.reference_id ?? '') === String(input.referenceId ?? '') &&
    String(item.value_text ?? '') === String(input.valueText ?? '') &&
    String(item.numeric_value ?? '') === String(input.numericValue ?? ''))

  const now = new Date().toISOString()
  let saved
  if (existing) {
    await dataProvider.update(COLLECTIONS.brewDoneItDeductions, existing.id, {
      answer: input.answer,
      updated_at: now,
      idempotency_key: key
    })
    saved = await dataProvider.get(COLLECTIONS.brewDoneItDeductions, existing.id)
  } else {
    saved = first(await dataProvider.create(COLLECTIONS.brewDoneItDeductions, {
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
    }))
  }

  response.status(existing ? 200 : 201).json({ deduction: projectBrewDoneItDeduction(saved) })
}

export const __testables = { aggregate, sharingEnabled }
