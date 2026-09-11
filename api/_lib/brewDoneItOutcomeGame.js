import { COLLECTIONS } from '../../src/data/contract.js'
import { calculateBrewDoneItDeductionScore } from '../../src/utils/brewDoneItDeductionScoring.js'
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
  .filter((value) => value !== null && value !== undefined)
  .some((value) => String(value) === String(userId))

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

const guesserRound = async (roundId, user) => {
  let round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, id(roundId, 'Round identifier'))
  if (!round) throw fail('Round not found.', 404)
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, round.game_id)
  if (!game || !participant(game, user.id)) throw fail('Round not found.', 404)
  if (String(round.guesser_participant_id) !== String(user.id)) throw fail('Only the guesser can submit an outcome.', 403)
  round = await reconcileOutcomeRound(round)
  return { round, game }
}

const requireActiveRound = ({ round, game }) => {
  if (game.status !== 'active' || round.status !== 'guessing') throw fail('This round is not accepting outcomes.', 409)
  return { round, game }
}

const activeGuesser = async (roundId, user) => requireActiveRound(await guesserRound(roundId, user))

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

const sameFormalGuess = (guess, input) => guess.guess_type === input.guessType && (
  input.guessType === 'beer' ? String(guess.guessed_product_id) === String(input.referenceId)
    : input.guessType === 'brewery' ? String(guess.guessed_producer_id) === String(input.referenceId)
      : String(guess.guessed_category_id) === String(input.referenceId)
)

const outcomeReference = (guessType) => guessType === 'beer'
  ? { collection: COLLECTIONS.products, label: 'Beer' }
  : guessType === 'brewery'
    ? { collection: COLLECTIONS.producers, label: 'Brewery' }
    : { collection: COLLECTIONS.categories, label: 'Style' }

const requireOutcomeReference = async (input) => {
  const { collection, label } = outcomeReference(input.guessType)
  const record = await dataProvider.get(collection, input.referenceId)
  if (!record) throw fail(`${label} not found.`, 404)
  return record
}

const requireOutcomeUnsolved = (round, input) => {
  if (round.beer_correct) throw fail('The exact beer is already solved. Finish the round to bank the result.', 409)
  if (input.guessType === 'brewery' && round.brewery_correct) throw fail('The brewery is already solved.', 409)
  if (input.guessType === 'style' && round.style_correct) throw fail('The style fallback is already solved.', 409)
}

const commitGuess = async (guess, roundVersion) => {
  await dataProvider.update(COLLECTIONS.brewDoneItGuesses, guess.id, {
    action_state: 'committed',
    committed_round_version: roundVersion
  })
  return dataProvider.get(COLLECTIONS.brewDoneItGuesses, guess.id)
}

const finaliseReservedOutcome = async (round, guess) => {
  const key = guess.idempotency_key
  if (!round.pending_action_key || round.pending_action_key !== key || !String(round.pending_action_type || '').startsWith('outcome:')) return round
  const correct = Boolean(guess.is_correct)
  const type = guess.guess_type
  const incorrect = Number(round.incorrect_formal_guess_count ?? round.incorrect_guess_count ?? 0) + (correct ? 0 : 1)
  return cas(COLLECTIONS.brewDoneItRounds, round, Number(round.version || 0), {
    turn_sequence: Number(round.turn_sequence || 0) + 1,
    incorrect_formal_guess_count: incorrect,
    incorrect_guess_count: incorrect,
    brewery_correct: Boolean(round.brewery_correct) || (correct && (type === 'brewery' || type === 'beer')),
    style_correct: Boolean(round.style_correct) || (correct && type === 'style'),
    beer_correct: Boolean(round.beer_correct) || (correct && type === 'beer'),
    pending_action_key: null,
    pending_action_type: null,
    pending_action_started_at: null,
    last_action_key: key,
    last_action_type: `outcome:${type}`
  })
}

export const reconcileOutcomeRound = async (round) => {
  if (!round?.pending_action_key || !String(round.pending_action_type || '').startsWith('outcome:')) return round
  const key = round.pending_action_key
  const guess = list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id, idempotency_key: key }))[0]
  if (!guess) {
    return cas(COLLECTIONS.brewDoneItRounds, round, Number(round.version || 0), {
      pending_action_key: null,
      pending_action_type: null,
      pending_action_started_at: null
    })
  }

  const savedRound = await finaliseReservedOutcome(round, guess)
  if (guess.action_state !== 'committed') await commitGuess(guess, savedRound.version)
  return savedRound
}

export const submitOutcomeGuess = async (roundId, request, response, user) => {
  const { round } = await activeGuesser(roundId, user)
  const { expectedVersion, idempotencyKey } = mutation(request)
  const input = sanitiseBrewDoneItOutcomeInput(request.body)
  const key = `${user.id}:${idempotencyKey}`
  const replay = list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id, idempotency_key: key }))[0]
  if (replay?.action_state === 'committed') {
    response.status(200).json({ guess: projectBrewDoneItGuess(replay), round: projectBrewDoneItRound(round, user.id), replayed: true })
    return
  }

  requireOutcomeUnsolved(round, input)
  if (Number(round.turn_sequence || 0) >= Number(round.max_turns || 20)) throw fail('This round has no remaining formal submissions.', 409)
  await requireOutcomeReference(input)

  const prior = list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id }))
    .filter((guess) => !guess.action_state || guess.action_state === 'committed')
  if (prior.some((guess) => sameFormalGuess(guess, input))) throw fail('This formal guess has already been submitted.', 409)

  const product = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!product) throw fail('The selected product cannot be resolved.', 409)
  const correct = isCorrect(input, product)
  const reserved = await cas(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    pending_action_key: key,
    pending_action_type: `outcome:${input.guessType}`,
    pending_action_started_at: new Date().toISOString()
  })

  let guess
  try {
    guess = first(await dataProvider.create(COLLECTIONS.brewDoneItGuesses, {
      round_id: round.id,
      turn_sequence: Number(round.turn_sequence || 0) + 1,
      guess_type: input.guessType,
      ...guessFields(input),
      guesser_participant_id: user.id,
      is_correct: correct,
      action_state: 'pending',
      created_at: new Date().toISOString(),
      idempotency_key: key
    }))
  } catch (error) {
    guess = list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id, idempotency_key: key }))[0]
    if (!guess) {
      await cas(COLLECTIONS.brewDoneItRounds, reserved, Number(reserved.version || 0), {
        pending_action_key: null,
        pending_action_type: null,
        pending_action_started_at: null
      }).catch(() => undefined)
      throw error
    }
  }

  const savedRound = await finaliseReservedOutcome(await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id), guess)
  if (guess.action_state !== 'committed') guess = await commitGuess(guess, savedRound.version)
  response.status(201).json({ guess: projectBrewDoneItGuess(guess), round: projectBrewDoneItRound(savedRound, user.id) })
}

export const completeDeductionRound = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = mutation(request)
  const key = `${user.id}:${idempotencyKey}`
  const loaded = await guesserRound(roundId, user)
  if (loaded.round.terminal_idempotency_key === key && loaded.round.status === 'completed') {
    response.status(200).json({ round: projectBrewDoneItRound(loaded.round, user.id), replayed: true })
    return
  }
  const { round } = requireActiveRound(loaded)
  const score = calculateBrewDoneItDeductionScore({
    breweryCorrect: Boolean(round.brewery_correct),
    beerCorrect: Boolean(round.beer_correct),
    styleCorrect: Boolean(round.style_correct),
    incorrectFormalGuessCount: Number(round.incorrect_formal_guess_count ?? round.incorrect_guess_count ?? 0)
  })
  const saved = await cas(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    status: 'completed',
    completion_reason: round.beer_correct ? 'exact_beer' : round.style_correct ? 'style_fallback' : round.brewery_correct ? 'brewery_only' : 'unsolved',
    completed_at: new Date().toISOString(),
    scoring_rules_version: score.version,
    awarded_points: score.total,
    score_breakdown: score.breakdown,
    terminal_idempotency_key: key
  })
  response.status(200).json({ round: projectBrewDoneItRound(saved, user.id) })
}

export const forfeitDeductionRound = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = mutation(request)
  const key = `${user.id}:${idempotencyKey}`
  const loaded = await guesserRound(roundId, user)
  if (loaded.round.terminal_idempotency_key === key && loaded.round.status === 'forfeited') {
    response.status(200).json({ round: projectBrewDoneItRound(loaded.round, user.id), replayed: true })
    return
  }
  const { round } = requireActiveRound(loaded)
  const score = calculateBrewDoneItDeductionScore({})
  const saved = await cas(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    status: 'forfeited',
    completion_reason: 'forfeit',
    completed_at: new Date().toISOString(),
    scoring_rules_version: score.version,
    awarded_points: 0,
    score_breakdown: score.breakdown,
    terminal_idempotency_key: key
  })
  response.status(200).json({ round: projectBrewDoneItRound(saved, user.id) })
}

export const setHistoryClueSharing = async (gameId, request, response, user) => {
  const { expectedVersion } = mutation(request)
  if (typeof request.body?.enabled !== 'boolean') throw fail('History clue preference is invalid.')
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, id(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw fail('Game not found.', 404)
  const field = String(game.creator_participant_id) === String(user.id) ? 'creator_history_clues_enabled' : 'opponent_history_clues_enabled'
  const saved = await cas(COLLECTIONS.brewDoneItGames, game, expectedVersion, {
    [field]: request.body.enabled,
    last_activity_at: new Date().toISOString()
  })
  response.status(200).json({ game: projectBrewDoneItGame(saved) })
}

export const __testables = { isCorrect, guessFields, sameFormalGuess, outcomeReference, requireOutcomeUnsolved }
