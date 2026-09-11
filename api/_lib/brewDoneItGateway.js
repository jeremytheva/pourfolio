import crypto from 'node:crypto'
import { COLLECTIONS } from '../../src/data/contract.js'
import {
  BREW_DONE_IT_RULES,
  calculateBrewDoneItRoundScore
} from '../../src/utils/brewDoneItChallengeScoring.js'
import { requireSessionUser } from './authSession.js'
import { dataProvider } from './dataProvider.js'
import {
  BREW_DONE_IT_QUESTION_TYPES,
  projectBrewDoneItGame,
  projectBrewDoneItGuess,
  projectBrewDoneItQuestion,
  projectBrewDoneItRound,
  sanitiseBrewDoneItCreateInput,
  sanitiseBrewDoneItGuessInput,
  sanitiseBrewDoneItJoinInput,
  sanitiseBrewDoneItQuestionInput
} from './brewDoneItPolicy.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from './httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST'])
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/
const TERMINAL_ROUND_STATES = new Set(['completed', 'forfeited'])

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const firstRecord = (value) => (Array.isArray(value) ? value[0] || null : value || null)

export const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  if (!raw) return []
  return String(raw).split('/').filter(Boolean)
}

const gameError = (message, status = 403, code) => {
  const error = new Error(message)
  error.status = status
  if (code) error.payload = { error: message, code }
  return error
}

const parsePositiveId = (value, label = 'Record identifier') => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) throw gameError(`${label} is invalid.`, 400)
  return text
}

const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .some((id) => id !== null && id !== undefined && String(id) === String(userId))

const transitionInput = (request) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {}
  const expectedVersion = Number(body.expectedVersion)
  const idempotencyKey = String(body.idempotencyKey || '').trim()
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw gameError('The expected version is invalid.', 400)
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw gameError('The idempotency key is invalid.', 400)
  }
  return { expectedVersion, idempotencyKey }
}

const versionConflict = (record) => {
  const error = gameError('The game changed before this request was applied.', 409)
  error.payload = {
    error: error.message,
    code: 'VERSION_CONFLICT',
    currentVersion: Number(record?.version || 0)
  }
  return error
}

const assertVersion = (record, expectedVersion) => {
  if (Number(record?.version || 0) !== expectedVersion) throw versionConflict(record)
}

const compareAndSet = async (collection, record, expectedVersion, updates) => {
  try {
    await dataProvider.compareAndSet(collection, record.id, expectedVersion, {
      ...updates,
      version: expectedVersion + 1
    })
  } catch (error) {
    if (error?.code !== 'VERSION_CONFLICT') throw error
    throw versionConflict(await dataProvider.get(collection, record.id))
  }
  const persisted = await dataProvider.get(collection, record.id)
  if (Number(persisted?.version) !== expectedVersion + 1) throw versionConflict(persisted)
  return persisted
}

const invitationDigest = (code) => crypto.createHash('sha256').update(code).digest('hex')
const invitationCodeFor = (creationKey) => {
  const signingKey = process.env.BREW_DONE_IT_INVITATION_KEY || process.env.NOCODEBACKEND_SECRET_KEY
  if (!signingKey) throw gameError('The game invitation service is not configured.', 503)
  return crypto.createHmac('sha256', signingKey).update(creationKey).digest('base64url')
}

const getGame = async (gameId, user) => {
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, parsePositiveId(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw gameError('Game not found.', 404)
  return game
}

const sameParticipants = (round, game) => {
  const roundIds = [round?.selector_participant_id, round?.guesser_participant_id]
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .sort()
  const gameIds = [game?.creator_participant_id, game?.opponent_participant_id]
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .sort()
  return roundIds.length <= gameIds.length && roundIds.every((id) => gameIds.includes(id))
}

const getRound = async (roundId, user) => {
  const round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, parsePositiveId(roundId, 'Round identifier'))
  if (!round) throw gameError('Round not found.', 404)
  const game = await getGame(round.game_id, user)
  if (!sameParticipants(round, game)) throw gameError('Round participant relationship is invalid.', 409)
  return { round, game }
}

const getRounds = async (game) => normaliseList(
  await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id })
).sort((left, right) => Number(left.round_number) - Number(right.round_number))

const ensureInitialRound = async (game, productId, createdAt) => {
  const [existing] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, {
    game_id: game.id,
    round_number: 1
  }))
  if (existing) return existing

  try {
    return firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItRounds, {
      game_id: game.id,
      round_number: 1,
      selector_participant_id: game.creator_participant_id,
      guesser_participant_id: game.opponent_participant_id ?? null,
      selected_product_id: productId,
      status: game.opponent_participant_id ? 'guessing' : 'waiting_for_opponent',
      turn_sequence: 0,
      max_turns: BREW_DONE_IT_RULES.maxTurns,
      question_count: 0,
      incorrect_guess_count: 0,
      created_at: createdAt,
      started_at: game.opponent_participant_id ? game.joined_at || createdAt : null,
      completed_at: null,
      completion_reason: null,
      scoring_rules_version: null,
      awarded_points: null,
      score_breakdown: null,
      version: 0
    }))
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    const [persisted] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, {
      game_id: game.id,
      round_number: 1
    }))
    if (!persisted) throw error
    return persisted
  }
}

const createGame = async (request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  if (expectedVersion !== 0) throw versionConflict({ version: 0 })
  const { productId } = sanitiseBrewDoneItCreateInput(request.body)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw gameError('Product not found.', 404)

  const now = new Date().toISOString()
  const creationKey = `${user.id}:${idempotencyKey}`
  const invitationCode = invitationCodeFor(creationKey)
  const [existing] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGames, {
    creation_idempotency_key: creationKey
  }))
  if (existing && String(existing.creator_participant_id) === String(user.id)) {
    const round = await ensureInitialRound(existing, productId, existing.created_at || now)
    response.status(200).json({
      game: projectBrewDoneItGame(existing),
      round: projectBrewDoneItRound(round, user.id),
      invitationCode,
      replayed: true
    })
    return
  }

  const game = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItGames, {
    creator_participant_id: user.id,
    opponent_participant_id: null,
    invitation_digest: invitationDigest(invitationCode),
    status: 'waiting',
    current_round_number: 1,
    version: 0,
    creation_idempotency_key: creationKey,
    expires_at: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
    created_at: now,
    joined_at: null,
    last_activity_at: now,
    archived_at: null
  }))
  if (!game?.id) throw new Error('The game service did not return a game identifier.')

  try {
    const round = await ensureInitialRound(game, productId, now)
    response.status(201).json({
      game: projectBrewDoneItGame(game),
      round: projectBrewDoneItRound(round, user.id),
      invitationCode
    })
  } catch (error) {
    try { await dataProvider.remove(COLLECTIONS.brewDoneItGames, game.id) } catch {}
    throw error
  }
}

const joinGame = async (gameId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const id = parsePositiveId(gameId, 'Game identifier')
  const { inviteCode } = sanitiseBrewDoneItJoinInput(request.body)
  let game = await dataProvider.get(COLLECTIONS.brewDoneItGames, id)
  const requestKey = `${user.id}:${idempotencyKey}`

  if (game?.join_idempotency_key === requestKey && String(game.opponent_participant_id) === String(user.id)) {
    const [round] = await getRounds(game)
    if (!round) throw gameError('The opening round is unavailable.', 409)
    let persistedRound = round
    if (String(round.guesser_participant_id || '') !== String(user.id) || round.status === 'waiting_for_opponent') {
      persistedRound = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, Number(round.version || 0), {
        guesser_participant_id: user.id,
        status: 'guessing',
        started_at: round.started_at || game.joined_at || new Date().toISOString()
      })
    }
    response.status(200).json({
      game: projectBrewDoneItGame(game),
      round: projectBrewDoneItRound(persistedRound, user.id),
      replayed: true
    })
    return
  }

  if (!game || game.invitation_digest !== invitationDigest(inviteCode)) throw gameError('Game invitation is invalid.', 404)
  assertVersion(game, expectedVersion)
  if (Date.parse(game.expires_at) <= Date.now()) throw gameError('Game invitation has expired.', 409)
  if (game.status !== 'waiting' || game.opponent_participant_id) throw gameError('Game invitation is no longer available.', 409)
  if (String(game.creator_participant_id) === String(user.id)) throw gameError('The challenge creator cannot join as the opponent.', 409)

  const joinedAt = new Date().toISOString()
  game = await compareAndSet(COLLECTIONS.brewDoneItGames, game, expectedVersion, {
    opponent_participant_id: user.id,
    status: 'active',
    joined_at: joinedAt,
    last_activity_at: joinedAt,
    invitation_digest: null,
    join_idempotency_key: requestKey
  })

  const [round] = await getRounds(game)
  if (!round) throw gameError('The opening round is unavailable.', 409)
  const persistedRound = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, Number(round.version || 0), {
    guesser_participant_id: user.id,
    status: 'guessing',
    started_at: joinedAt
  })
  response.status(200).json({
    game: projectBrewDoneItGame(game),
    round: projectBrewDoneItRound(persistedRound, user.id)
  })
}

const createNextRound = async (gameId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { productId } = sanitiseBrewDoneItCreateInput(request.body)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw gameError('Product not found.', 404)
  let game = await getGame(gameId, user)
  if (game.status !== 'active' || !game.opponent_participant_id) throw gameError('This series cannot start another round.', 409)
  assertVersion(game, expectedVersion)

  const rounds = await getRounds(game)
  const previous = rounds.at(-1)
  if (!previous || !TERMINAL_ROUND_STATES.has(previous.status)) {
    throw gameError('Finish the current round before starting another.', 409)
  }

  const selectorId = previous.guesser_participant_id
  const guesserId = previous.selector_participant_id
  if (String(selectorId) !== String(user.id)) {
    throw gameError('It is the other player’s turn to choose the next secret beer.', 403)
  }

  const requestKey = `${user.id}:${idempotencyKey}`
  const [replayed] = rounds.filter((round) => round.round_creation_idempotency_key === requestKey)
  if (replayed) {
    response.status(200).json({
      game: projectBrewDoneItGame(game),
      round: projectBrewDoneItRound(replayed, user.id),
      replayed: true
    })
    return
  }

  const roundNumber = Number(previous.round_number) + 1
  const now = new Date().toISOString()
  let created
  try {
    created = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItRounds, {
      game_id: game.id,
      round_number: roundNumber,
      selector_participant_id: selectorId,
      guesser_participant_id: guesserId,
      selected_product_id: productId,
      status: 'guessing',
      turn_sequence: 0,
      max_turns: BREW_DONE_IT_RULES.maxTurns,
      question_count: 0,
      incorrect_guess_count: 0,
      created_at: now,
      started_at: now,
      completed_at: null,
      completion_reason: null,
      scoring_rules_version: null,
      awarded_points: null,
      score_breakdown: null,
      round_creation_idempotency_key: requestKey,
      version: 0
    }))
  } catch (error) {
    if (!dataProvider.isUniqueConflict(error)) throw error
    const [persisted] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, {
      game_id: game.id,
      round_number: roundNumber
    }))
    if (!persisted || persisted.round_creation_idempotency_key !== requestKey) throw error
    created = persisted
  }

  try {
    game = await compareAndSet(COLLECTIONS.brewDoneItGames, game, expectedVersion, {
      current_round_number: roundNumber,
      last_activity_at: now
    })
  } catch (error) {
    if (!error?.payload || error.payload.code !== 'VERSION_CONFLICT') throw error
    const refreshed = await getGame(game.id, user)
    if (Number(refreshed.current_round_number) !== roundNumber) throw error
    game = refreshed
  }

  response.status(201).json({
    game: projectBrewDoneItGame(game),
    round: projectBrewDoneItRound(created, user.id)
  })
}

const answerQuestion = async (question, targetProduct) => {
  if (question.questionType === BREW_DONE_IT_QUESTION_TYPES.producer) {
    if (!await dataProvider.get(COLLECTIONS.producers, question.referenceId)) throw gameError('Question reference not found.', 404)
    return String(targetProduct.producer_id) === String(question.referenceId)
  }
  if (question.questionType === BREW_DONE_IT_QUESTION_TYPES.category) {
    if (!await dataProvider.get(COLLECTIONS.categories, question.referenceId)) throw gameError('Question reference not found.', 404)
    return String(targetProduct.product_category_id) === String(question.referenceId)
  }
  if (question.questionType === BREW_DONE_IT_QUESTION_TYPES.abvAtLeast) {
    const abv = Number(targetProduct.abv)
    return Number.isFinite(abv) && abv >= question.threshold
  }
  if (question.questionType === BREW_DONE_IT_QUESTION_TYPES.ibuAtLeast) {
    const ibu = Number(targetProduct.ibu)
    return Number.isFinite(ibu) && ibu >= question.threshold
  }
  if (question.questionType === BREW_DONE_IT_QUESTION_TYPES.collaboration) {
    return Boolean(targetProduct.collaboration) && String(targetProduct.collaboration) !== '0'
  }
  throw gameError('Question type is invalid.', 400)
}

const questionKey = (question) => [question.questionType, question.referenceId || '', question.threshold ?? ''].join(':')

const completeRound = async (round, expectedVersion, updates) => {
  const score = calculateBrewDoneItRoundScore({
    correct: Boolean(updates.correct),
    questionCount: Number(updates.questionCount ?? round.question_count ?? 0),
    incorrectGuessCount: Number(updates.incorrectGuessCount ?? round.incorrect_guess_count ?? 0)
  })
  return compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    ...updates.roundUpdates,
    status: 'completed',
    completed_at: updates.completedAt || new Date().toISOString(),
    completion_reason: updates.completionReason,
    scoring_rules_version: score.version,
    awarded_points: score.total,
    score_breakdown: score.breakdown
  })
}

const askQuestion = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { round, game } = await getRound(roundId, user)
  if (String(round.guesser_participant_id) !== String(user.id)) throw gameError('Only the guesser can ask a question.')
  if (game.status !== 'active' || round.status !== 'guessing' || !round.selected_product_id) {
    throw gameError('This round is not accepting questions.', 409)
  }

  const requestKey = `${user.id}:${idempotencyKey}`
  const [replayed] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItQuestions, {
    round_id: round.id,
    idempotency_key: requestKey
  }))
  if (replayed) {
    response.status(200).json({
      question: projectBrewDoneItQuestion(replayed),
      round: projectBrewDoneItRound(await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id), user.id),
      replayed: true
    })
    return
  }

  assertVersion(round, expectedVersion)
  if (Number(round.question_count || 0) >= BREW_DONE_IT_RULES.maxQuestions) {
    throw gameError('This round has no remaining questions.', 409)
  }
  const question = sanitiseBrewDoneItQuestionInput(request.body)
  const existing = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItQuestions, { round_id: round.id }))
  if (existing.some((item) => questionKey({
    questionType: item.question_type,
    referenceId: item.reference_id,
    threshold: item.threshold
  }) === questionKey(question))) throw gameError('This question has already been asked.', 409)

  const targetProduct = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!targetProduct) throw gameError('The selected product cannot be resolved.', 409)
  const answer = await answerQuestion(question, targetProduct)
  const turnSequence = Number(round.turn_sequence || 0) + 1
  if (turnSequence > Number(round.max_turns || BREW_DONE_IT_RULES.maxTurns)) {
    throw gameError('This round has no remaining turns.', 409)
  }
  const now = new Date().toISOString()
  let created
  try {
    created = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItQuestions, {
      round_id: round.id,
      turn_sequence: turnSequence,
      question_type: question.questionType,
      reference_id: question.referenceId,
      threshold: question.threshold,
      answer,
      asked_by_participant_id: user.id,
      uniqueness_key: `${round.id}:${questionKey(question)}`,
      created_at: now,
      idempotency_key: requestKey
    }))
  } catch (error) {
    if (dataProvider.isUniqueConflict(error)) throw gameError('This question has already been asked.', 409)
    throw error
  }

  const questionCount = Number(round.question_count || 0) + 1
  const reachedLimit = turnSequence === Number(round.max_turns || BREW_DONE_IT_RULES.maxTurns)
  const persisted = reachedLimit
    ? await completeRound(round, expectedVersion, {
        correct: false,
        questionCount,
        incorrectGuessCount: Number(round.incorrect_guess_count || 0),
        completedAt: now,
        completionReason: 'turn_limit',
        roundUpdates: { turn_sequence: turnSequence, question_count: questionCount }
      })
    : await compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
        turn_sequence: turnSequence,
        question_count: questionCount
      })

  response.status(201).json({
    question: projectBrewDoneItQuestion(created),
    round: projectBrewDoneItRound(persisted, user.id)
  })
}

const submitGuess = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { round, game } = await getRound(roundId, user)
  if (String(round.guesser_participant_id) !== String(user.id)) throw gameError('Only the guesser can submit a beer guess.')
  if (game.status !== 'active' || round.status !== 'guessing' || !round.selected_product_id) {
    throw gameError('This round is not accepting guesses.', 409)
  }

  const requestKey = `${user.id}:${idempotencyKey}`
  const [replayed] = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, {
    round_id: round.id,
    idempotency_key: requestKey
  }))
  if (replayed) {
    response.status(200).json({
      guess: projectBrewDoneItGuess(replayed),
      round: projectBrewDoneItRound(await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id), user.id),
      replayed: true
    })
    return
  }

  assertVersion(round, expectedVersion)
  const { productId } = sanitiseBrewDoneItGuessInput(request.body)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw gameError('Product not found.', 404)
  const previous = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id }))
  if (previous.some((guess) => String(guess.guessed_product_id) === String(productId))) {
    throw gameError('This beer has already been guessed.', 409)
  }

  const turnSequence = Number(round.turn_sequence || 0) + 1
  if (turnSequence > Number(round.max_turns || BREW_DONE_IT_RULES.maxTurns)) {
    throw gameError('This round has no remaining turns.', 409)
  }
  const correct = String(productId) === String(round.selected_product_id)
  const incorrectGuessCount = Number(round.incorrect_guess_count || 0) + (correct ? 0 : 1)
  const now = new Date().toISOString()
  let created
  try {
    created = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItGuesses, {
      round_id: round.id,
      turn_sequence: turnSequence,
      guessed_product_id: productId,
      guesser_participant_id: user.id,
      is_correct: correct,
      uniqueness_key: `${round.id}:${productId}`,
      created_at: now,
      idempotency_key: requestKey
    }))
  } catch (error) {
    if (dataProvider.isUniqueConflict(error)) throw gameError('This beer has already been guessed.', 409)
    throw error
  }

  const reachedLimit = turnSequence === Number(round.max_turns || BREW_DONE_IT_RULES.maxTurns)
  const completed = correct || reachedLimit
  const persisted = completed
    ? await completeRound(round, expectedVersion, {
        correct,
        questionCount: Number(round.question_count || 0),
        incorrectGuessCount,
        completedAt: now,
        completionReason: correct ? 'correct_guess' : 'turn_limit',
        roundUpdates: { turn_sequence: turnSequence, incorrect_guess_count: incorrectGuessCount }
      })
    : await compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
        turn_sequence: turnSequence,
        incorrect_guess_count: incorrectGuessCount
      })

  response.status(201).json({
    guess: projectBrewDoneItGuess(created),
    round: projectBrewDoneItRound(persisted, user.id)
  })
}

const forfeitRound = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const { round, game } = await getRound(roundId, user)
  if (game.status !== 'active' || round.status !== 'guessing') throw gameError('Only an active round can be forfeited.', 409)
  const requestKey = `${user.id}:${idempotencyKey}`
  if (round.terminal_idempotency_key === requestKey) {
    response.status(200).json({ round: projectBrewDoneItRound(round, user.id), replayed: true })
    return
  }
  assertVersion(round, expectedVersion)
  const now = new Date().toISOString()
  const score = calculateBrewDoneItRoundScore({ correct: false })
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    status: 'forfeited',
    completion_reason: 'forfeit',
    completed_at: now,
    scoring_rules_version: score.version,
    awarded_points: 0,
    score_breakdown: score.breakdown,
    terminal_idempotency_key: requestKey
  })
  response.status(200).json({ round: projectBrewDoneItRound(persisted, user.id) })
}

const transitionGame = async (gameId, action, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  const game = await getGame(gameId, user)
  const requestKey = `${user.id}:${idempotencyKey}`
  if (game.terminal_idempotency_key === requestKey) {
    response.status(200).json({ game: projectBrewDoneItGame(game), replayed: true })
    return
  }
  assertVersion(game, expectedVersion)
  const now = new Date().toISOString()

  if (action === 'cancel') {
    if (game.status !== 'waiting' || String(game.creator_participant_id) !== String(user.id)) {
      throw gameError('Only the challenge creator can cancel a waiting invitation.', 409)
    }
  } else if (action === 'archive') {
    if (game.status !== 'active') throw gameError('Only an active series can be archived.', 409)
    const rounds = await getRounds(game)
    if (rounds.some((round) => !TERMINAL_ROUND_STATES.has(round.status))) {
      throw gameError('Finish or forfeit the current round before archiving this series.', 409)
    }
  } else if (action === 'expire') {
    if (game.status !== 'waiting' || Date.parse(game.expires_at) > Date.now()) {
      throw gameError('This invitation is not eligible for expiry.', 409)
    }
  } else {
    throw gameError('Game transition not found.', 404)
  }

  const status = action === 'cancel' ? 'cancelled' : action === 'archive' ? 'archived' : 'expired'
  const persisted = await compareAndSet(COLLECTIONS.brewDoneItGames, game, expectedVersion, {
    status,
    last_activity_at: now,
    ...(action === 'archive' ? { archived_at: now } : {}),
    terminal_idempotency_key: requestKey
  })
  response.status(200).json({ game: projectBrewDoneItGame(persisted) })
}

const showGame = async (gameId, response, user) => {
  const game = await getGame(gameId, user)
  const rounds = await getRounds(game)
  const projectedRounds = await Promise.all(rounds.map(async (round) => {
    const [guesses, questions] = await Promise.all([
      dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: round.id }),
      dataProvider.list(COLLECTIONS.brewDoneItQuestions, { round_id: round.id })
    ])
    return {
      ...projectBrewDoneItRound(round, user.id),
      guesses: normaliseList(guesses)
        .sort((left, right) => Number(left.turn_sequence) - Number(right.turn_sequence))
        .map(projectBrewDoneItGuess),
      questions: normaliseList(questions)
        .sort((left, right) => Number(left.turn_sequence) - Number(right.turn_sequence))
        .map(projectBrewDoneItQuestion)
    }
  }))
  response.status(200).json({ game: projectBrewDoneItGame(game), rounds: projectedRounds })
}

const statsForUser = async (response, user) => {
  const games = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItGames))
    .filter((game) => participant(game, user.id) && game.opponent_participant_id)
  const roundsByGame = await Promise.all(games.map(async (game) => ({
    game,
    rounds: normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
      .filter((round) => round.status === 'completed')
  })))

  const headToHead = new Map()
  let completedRounds = 0
  let roundsAsGuesser = 0
  let correctGuesses = 0
  let awardedPoints = 0

  for (const { game, rounds } of roundsByGame) {
    const opponentId = String(game.creator_participant_id) === String(user.id)
      ? game.opponent_participant_id
      : game.creator_participant_id
    const key = String(opponentId)
    const aggregate = headToHead.get(key) || {
      opponentParticipantId: opponentId,
      completedRounds: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      correctGuessesFor: 0,
      correctGuessesAgainst: 0,
      lastPlayedAt: null
    }

    for (const round of rounds) {
      completedRounds += 1
      aggregate.completedRounds += 1
      const userWasGuesser = String(round.guesser_participant_id) === String(user.id)
      const points = Number(round.awarded_points || 0)
      const correct = round.completion_reason === 'correct_guess'
      if (userWasGuesser) {
        roundsAsGuesser += 1
        awardedPoints += points
        aggregate.pointsFor += points
        if (correct) {
          correctGuesses += 1
          aggregate.correctGuessesFor += 1
        }
      } else {
        aggregate.pointsAgainst += points
        if (correct) aggregate.correctGuessesAgainst += 1
      }
      if (!aggregate.lastPlayedAt || Date.parse(round.completed_at) > Date.parse(aggregate.lastPlayedAt)) {
        aggregate.lastPlayedAt = round.completed_at
      }
    }
    headToHead.set(key, aggregate)
  }

  response.status(200).json({
    seriesCount: games.length,
    completedRounds,
    roundsAsGuesser,
    correctGuesses,
    awardedPoints,
    averagePointsPerGuessingRound: roundsAsGuesser
      ? Number((awardedPoints / roundsAsGuesser).toFixed(2))
      : 0,
    headToHead: [...headToHead.values()].sort((left, right) =>
      Date.parse(right.lastPlayedAt || 0) - Date.parse(left.lastPlayedAt || 0)
    )
  })
}

export const routeBrewDoneItRequest = async (request, response, user) => {
  const segments = pathSegments(request)
  const [, resource, id, action] = segments

  if (resource === 'games' && !id && request.method === 'POST') return createGame(request, response, user)
  if (resource === 'games' && id && action === 'join' && request.method === 'POST') return joinGame(id, request, response, user)
  if (resource === 'games' && id && action === 'rounds' && request.method === 'POST') return createNextRound(id, request, response, user)
  if (resource === 'games' && id && ['cancel', 'archive', 'expire'].includes(action) && request.method === 'POST') {
    return transitionGame(id, action, request, response, user)
  }
  if (resource === 'games' && id && !action && request.method === 'GET') return showGame(id, response, user)
  if (resource === 'rounds' && id && action === 'guesses' && request.method === 'POST') return submitGuess(id, request, response, user)
  if (resource === 'rounds' && id && action === 'questions' && request.method === 'POST') {
    if (!enforceRateLimit(request, response, { key: `brew-question:${id}`, limit: 20, windowMs: 60_000 })) return
    return askQuestion(id, request, response, user)
  }
  if (resource === 'rounds' && id && action === 'forfeit' && request.method === 'POST') return forfeitRound(id, request, response, user)
  if (resource === 'stats' && !id && request.method === 'GET') return statsForUser(response, user)

  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function brewDoneItHandler(request, response) {
  if (process.env.BREW_DONE_IT_POLICY_ENABLED !== 'true') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }

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
    key: request.method === 'GET' ? 'brew-data-read' : 'brew-data-write',
    limit: request.method === 'GET' ? 120 : 60
  })) return

  try {
    const user = await requireSessionUser(request)
    await routeBrewDoneItRequest(request, response, user)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/brew-done-it/:resource',
        method: request.method,
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
  ALLOWED_METHODS,
  INVITATION_LIFETIME_MS,
  participant,
  sameParticipants,
  transitionInput,
  invitationDigest,
  invitationCodeFor,
  createGame,
  joinGame,
  createNextRound,
  askQuestion,
  submitGuess,
  forfeitRound,
  showGame,
  statsForUser,
  answerQuestion,
  routeBrewDoneItRequest
}
