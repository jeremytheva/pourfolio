import { COLLECTIONS } from '../../src/data/contract.js'
import { calculateBrewDoneItRoundScore } from '../../src/utils/brewDoneItChallengeScoring.js'
import { dataProvider } from './dataProvider.js'
import { projectBrewDoneItGame, projectBrewDoneItGuess, projectBrewDoneItRound, sanitiseBrewDoneItOutcomeInput } from './brewDoneItPolicy.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const first = (value) => list(value)[0] || value || null
const fail = (message, status = 400, code = null) => Object.assign(new Error(message), { status, ...(code ? { code } : {}) })
const id = (value, label) => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) throw fail(`${label} is invalid.`)
  return text
}
const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .filter((value) => value !== null && value !== undefined).some((value) => String(value) === String(userId))

const mutation = (request) => {
  const expectedVersion = Number(request.body?.expectedVersion)
  const idempotencyKey = String(request.body?.idempotencyKey || '').trim()
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw fail('The expected version is invalid.')
  if (!/^[A-Za-z0-9:_-]{8,180}$/.test(idempotencyKey)) throw fail('The idempotency key is invalid.')
  return { expectedVersion, idempotencyKey }
}

const conflict = (record) => {
  const error = fail('The game changed before this request was applied.', 409, 'VERSION_CONFLICT')
  error.payload = { error: error.message, code: error.code, currentVersion: Number(record?.version || 0) }
  return error
}

const cas = async (collection, record, expectedVersion, updates) => {
  if (Number(record?.version || 0) !== expectedVersion) throw conflict(record)
  try {
    await dataProvider.compareAndSet(collection, record.id, expectedVersion, { ...updates, version: expectedVersion + 1 })
  } catch (error) {
    if (error?.code !== 'VERSION_CONFLICT') throw error
    throw conflict(await dataProvider.get(collection, record.id))
  }
  const saved = await dataProvider.get(collection, record.id)
  if (Number(saved?.version || 0) !== expectedVersion + 1) throw conflict(saved)
  return saved
}

const activeGuesser = async (roundId, user) => {
  const round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, id(roundId, 'Round identifier'))
  if (!round) throw fail('Round not found.', 404)
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, round.game_id)
  if (!game || !participant(game, user.id)) throw fail('Round not found.', 404)
  if (String(round.guesser_participant_id) !== String(user.id)) throw fail('Only the guesser can submit an outcome.', 403)
  if (game.status !== 'active' || round.status !== 'guessing') throw fail('This round is not accepting outcomes.', 409)
  return { round, game }
}

const isCorrect = (input, product) => input.guessType === 'brewery'
  ? String(input.referenceId) === String(product.producer_id)
  : input.guessType === 'style'
    ? String(input.referenceId) === String(product.product_category_id)
    : String(input.referenceId) === String(product.id)

const guessFields = (input) => ({
  guessed_product_id: input.guessType === 'beer' ? input.referenceId : null,
  guessed_producer_id: input.guessType === 'brewery' ? input.referenceId : null,
  guessed_category_id: input.guessType === 'style' ? input.referenceId : null
})

export const submitOutcomeGuess = async (roundId, request, response, user) => {
  const { round } = await activeGuesser(roundId, user)
  const { expectedVersion, idempotencyKey } = mutation(request)
  const input = sanitiseBrewDoneItOutcomeInput(request.body)
  const key = `${user.id}:${idempotencyKey}`
  const replay = list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id, idempotency_key: key }))[0]
  if (replay?.action_state === 'committed') {
    return response.status(200).json({ guess: projectBrewDoneItGuess(replay), round: projectBrewDoneItRound(await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id), user.id), replayed: true })
  }
  if (round.pending_action_key && round.pending_action_key !== key) throw conflict(round)

  const product = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!product) throw fail('The selected product cannot be resolved.', 409)
  const correct = isCorrect(input, product)
  const reserved = round.pending_action_key === key ? round : await cas(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    pending_action_key: key, pending_action_type: `outcome:${input.guessType}`, pending_action_started_at: new Date().toISOString()
  })

  let guess = replay
  if (!guess) {
    try {
      guess = first(await dataProvider.create(COLLECTIONS.brewDoneItGuesses, {
        round_id: round.id, turn_sequence: Number(round.turn_sequence || 0) + 1, guess_type: input.guessType,
        ...guessFields(input), guesser_participant_id: user.id, is_correct: correct, action_state: 'pending',
        created_at: new Date().toISOString(), idempotency_key: key
      }))
    } catch (error) {
      guess = list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id, idempotency_key: key }))[0]
      if (!guess) {
        await cas(COLLECTIONS.brewDoneItRounds, reserved, Number(reserved.version || 0), { pending_action_key: null, pending_action_type: null, pending_action_started_at: null }).catch(() => undefined)
        throw error
      }
    }
  }

  let current = await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id)
  if (current.pending_action_key === key) {
    const incorrect = Number(current.incorrect_formal_guess_count ?? current.incorrect_guess_count ?? 0) + (correct ? 0 : 1)
    current = await cas(COLLECTIONS.brewDoneItRounds, current, Number(current.version || 0), {
      turn_sequence: Number(current.turn_sequence || 0) + 1,
      incorrect_formal_guess_count: incorrect,
      incorrect_guess_count: incorrect,
      brewery_correct: Boolean(current.brewery_correct) || (correct && (input.guessType === 'brewery' || input.guessType === 'beer')),
      style_correct: Boolean(current.style_correct) || (correct && input.guessType === 'style'),
      beer_correct: Boolean(current.beer_correct) || (correct && input.guessType === 'beer'),
      pending_action_key: null, pending_action_type: null, pending_action_started_at: null,
      last_action_key: key, last_action_type: `outcome:${input.guessType}`
    })
  } else if (current.last_action_key !== key) {
    throw conflict(current)
  }

  if (guess.action_state !== 'committed') {
    await dataProvider.update(COLLECTIONS.brewDoneItGuesses, guess.id, { ...guess, action_state: 'committed', committed_round_version: current.version })
    guess = await dataProvider.get(COLLECTIONS.brewDoneItGuesses, guess.id)
  }
  response.status(201).json({ guess: projectBrewDoneItGuess(guess), round: projectBrewDoneItRound(current, user.id) })
}

export const completeDeductionRound = async (roundId, request, response, user) => {
  const { round } = await activeGuesser(roundId, user)
  const { expectedVersion, idempotencyKey } = mutation(request)
  if (round.pending_action_key) throw fail('Finish the pending guess before completing the round.', 409)
  const key = `${user.id}:${idempotencyKey}`
  if (round.terminal_idempotency_key === key) return response.status(200).json({ round: projectBrewDoneItRound(round, user.id), replayed: true })
  const score = calculateBrewDoneItRoundScore({
    breweryCorrect: Boolean(round.brewery_correct), beerCorrect: Boolean(round.beer_correct), styleCorrect: Boolean(round.style_correct),
    incorrectFormalGuessCount: Number(round.incorrect_formal_guess_count ?? round.incorrect_guess_count ?? 0)
  })
  const saved = await cas(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    status: 'completed',
    completion_reason: round.beer_correct ? 'exact_beer' : round.style_correct ? 'style_fallback' : round.brewery_correct ? 'brewery_only' : 'unsolved',
    completed_at: new Date().toISOString(), scoring_rules_version: score.version, awarded_points: score.total,
    score_breakdown: score.breakdown, terminal_idempotency_key: key
  })
  response.status(200).json({ round: projectBrewDoneItRound(saved, user.id) })
}

export const setHistoryClueSharing = async (gameId, request, response, user) => {
  const { expectedVersion } = mutation(request)
  if (typeof request.body?.enabled !== 'boolean') throw fail('History clue preference is invalid.')
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, id(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw fail('Game not found.', 404)
  const field = String(game.creator_participant_id) === String(user.id) ? 'creator_history_clues_enabled' : 'opponent_history_clues_enabled'
  const saved = await cas(COLLECTIONS.brewDoneItGames, game, expectedVersion, { [field]: request.body.enabled, last_activity_at: new Date().toISOString() })
  response.status(200).json({ game: projectBrewDoneItGame(saved) })
}

export const __testables = { isCorrect, guessFields }
