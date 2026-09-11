import { COLLECTIONS } from '../../src/data/contract.js'
import {
  BREW_DONE_IT_RULES,
  calculateBrewDoneItRoundScore
} from '../../src/utils/brewDoneItChallengeScoring.js'
import { dataProvider } from './dataProvider.js'
import {
  BREW_DONE_IT_QUESTION_TYPES,
  projectBrewDoneItGame,
  projectBrewDoneItGuess,
  projectBrewDoneItQuestion,
  projectBrewDoneItRound,
  sanitiseBrewDoneItGuessInput,
  sanitiseBrewDoneItQuestionInput
} from './brewDoneItPolicy.js'

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/
const ACTION_PENDING = 'pending'
const ACTION_COMMITTED = 'committed'
const ACTION_DISCARDED = 'discarded'
const ACTION_GUESS = 'guess'
const ACTION_QUESTION = 'question'

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const firstRecord = (value) => (Array.isArray(value) ? value[0] || null : value || null)

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
  if (!persisted || Number(persisted.version) !== expectedVersion + 1) throw versionConflict(persisted)
  return persisted
}

const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .some((id) => id !== null && id !== undefined && String(id) === String(userId))

const sameParticipants = (round, game) => {
  const roundIds = [round?.selector_participant_id, round?.guesser_participant_id]
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .sort()
  const gameIds = [game?.creator_participant_id, game?.opponent_participant_id]
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .sort()
  return roundIds.length === 2 && roundIds.length === gameIds.length && roundIds.every((id, index) => id === gameIds[index])
}

const getGame = async (gameId, user) => {
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, parsePositiveId(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw gameError('Game not found.', 404)
  return game
}

const getRound = async (roundId, user) => {
  const round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, parsePositiveId(roundId, 'Round identifier'))
  if (!round) throw gameError('Round not found.', 404)
  const game = await getGame(round.game_id, user)
  if (!sameParticipants(round, game)) throw gameError('Round participant relationship is invalid.', 409)
  return { round, game }
}

const childCollection = (actionType) => actionType === ACTION_GUESS
  ? COLLECTIONS.brewDoneItGuesses
  : COLLECTIONS.brewDoneItQuestions

const childProjection = (actionType, child) => actionType === ACTION_GUESS
  ? projectBrewDoneItGuess(child)
  : projectBrewDoneItQuestion(child)

const findActionByKey = async (roundId, actionType, requestKey) => {
  const [record] = normaliseList(await dataProvider.list(childCollection(actionType), {
    round_id: roundId,
    idempotency_key: requestKey
  }))
  return record || null
}

const pendingChildren = async (roundId) => {
  const [guesses, questions] = await Promise.all([
    dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: roundId, action_state: ACTION_PENDING }),
    dataProvider.list(COLLECTIONS.brewDoneItQuestions, { round_id: roundId, action_state: ACTION_PENDING })
  ])
  return [
    ...normaliseList(guesses).map((record) => ({ actionType: ACTION_GUESS, record })),
    ...normaliseList(questions).map((record) => ({ actionType: ACTION_QUESTION, record }))
  ]
}

const verifyChildState = async (actionType, childId, expectedState) => {
  const persisted = await dataProvider.get(childCollection(actionType), childId)
  if (!persisted || persisted.action_state !== expectedState) {
    const error = gameError('The game action could not be durably reconciled.', 502)
    error.code = 'ACTION_RECONCILIATION_FAILED'
    throw error
  }
  return persisted
}

const setChildState = async (actionType, child, actionState, committedRoundVersion = null) => {
  await dataProvider.update(childCollection(actionType), child.id, {
    action_state: actionState,
    committed_round_version: committedRoundVersion
  })
  return verifyChildState(actionType, child.id, actionState)
}

const clearPendingFields = {
  pending_action_key: null,
  pending_action_type: null,
  pending_action_started_at: null
}

const terminalUpdates = ({ round, correct, questionCount, incorrectGuessCount, completionReason, completedAt }) => {
  const score = calculateBrewDoneItRoundScore({ correct, questionCount, incorrectGuessCount })
  return {
    status: 'completed',
    completed_at: completedAt,
    completion_reason: completionReason,
    scoring_rules_version: score.version,
    awarded_points: score.total,
    score_breakdown: score.breakdown,
    question_count: questionCount,
    incorrect_guess_count: incorrectGuessCount,
    max_turns: Number(round.max_turns || BREW_DONE_IT_RULES.maxTurns)
  }
}

const finaliseReservedAction = async (reservedRound, actionType, child) => {
  if (reservedRound.pending_action_key !== child.idempotency_key || reservedRound.pending_action_type !== actionType) {
    throw gameError('The pending game action no longer matches this request.', 409, 'ACTION_RESERVATION_MISMATCH')
  }

  const expectedTurn = Number(reservedRound.turn_sequence || 0) + 1
  if (Number(child.turn_sequence) !== expectedTurn) {
    throw gameError('The pending game action sequence is invalid.', 409, 'ACTION_SEQUENCE_MISMATCH')
  }

  const maxTurns = Number(reservedRound.max_turns || BREW_DONE_IT_RULES.maxTurns)
  if (expectedTurn > maxTurns) throw gameError('This round has no remaining turns.', 409)

  const completedAt = child.created_at || new Date().toISOString()
  let updates
  if (actionType === ACTION_QUESTION) {
    const questionCount = Number(reservedRound.question_count || 0) + 1
    const incorrectGuessCount = Number(reservedRound.incorrect_guess_count || 0)
    updates = expectedTurn === maxTurns
      ? terminalUpdates({
          round: reservedRound,
          correct: false,
          questionCount,
          incorrectGuessCount,
          completionReason: 'turn_limit',
          completedAt
        })
      : { question_count: questionCount, incorrect_guess_count: incorrectGuessCount }
  } else {
    const correct = Boolean(child.is_correct)
    const questionCount = Number(reservedRound.question_count || 0)
    const incorrectGuessCount = Number(reservedRound.incorrect_guess_count || 0) + (correct ? 0 : 1)
    updates = correct || expectedTurn === maxTurns
      ? terminalUpdates({
          round: reservedRound,
          correct,
          questionCount,
          incorrectGuessCount,
          completionReason: correct ? 'correct_guess' : 'turn_limit',
          completedAt
        })
      : { question_count: questionCount, incorrect_guess_count: incorrectGuessCount }
  }

  return compareAndSet(COLLECTIONS.brewDoneItRounds, reservedRound, Number(reservedRound.version), {
    ...updates,
    turn_sequence: expectedTurn,
    ...clearPendingFields,
    last_action_key: child.idempotency_key,
    last_action_type: actionType
  })
}

const discardUnacceptedChild = async (actionType, child) => {
  if (!child || child.action_state !== ACTION_PENDING) return child
  try {
    return await setChildState(actionType, child, ACTION_DISCARDED)
  } catch {
    return child
  }
}

const rollbackEmptyReservation = async (round) => compareAndSet(
  COLLECTIONS.brewDoneItRounds,
  round,
  Number(round.version),
  clearPendingFields
)

export const reconcileRoundActions = async (round) => {
  let current = round

  if (current.pending_action_key && current.pending_action_type) {
    const actionType = current.pending_action_type
    const child = await findActionByKey(current.id, actionType, current.pending_action_key)
    if (child && child.action_state !== ACTION_DISCARDED) {
      const finalised = await finaliseReservedAction(current, actionType, child)
      await setChildState(actionType, child, ACTION_COMMITTED, finalised.version)
      current = finalised
    } else {
      current = await rollbackEmptyReservation(current)
    }
  }

  const pending = await pendingChildren(current.id)
  for (const { actionType, record } of pending) {
    if (record.idempotency_key === current.last_action_key && actionType === current.last_action_type) {
      await setChildState(actionType, record, ACTION_COMMITTED, current.version)
    } else {
      await discardUnacceptedChild(actionType, record)
    }
  }

  return dataProvider.get(COLLECTIONS.brewDoneItRounds, current.id)
}

const reserveAction = async (round, expectedVersion, requestKey, actionType) => {
  if (round.pending_action_key) {
    throw gameError('Another game action is being reconciled. Refresh before trying again.', 409, 'ACTION_RECOVERY_REQUIRED')
  }
  if (Number(round.version || 0) !== expectedVersion) throw versionConflict(round)
  return compareAndSet(COLLECTIONS.brewDoneItRounds, round, expectedVersion, {
    pending_action_key: requestKey,
    pending_action_type: actionType,
    pending_action_started_at: new Date().toISOString()
  })
}

const recoverCreateResult = async (round, actionType, requestKey, createError) => {
  try {
    const persisted = await findActionByKey(round.id, actionType, requestKey)
    if (persisted) return persisted
  } catch {
    throw createError
  }

  try {
    await rollbackEmptyReservation(round)
  } catch {
    throw createError
  }
  throw createError
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

const committedChildren = async (collection, roundId) => normaliseList(await dataProvider.list(collection, {
  round_id: roundId,
  action_state: ACTION_COMMITTED
}))

const actionResponse = async (response, actionType, child, round, replayed = false) => {
  response.status(replayed ? 200 : 201).json({
    [actionType === ACTION_GUESS ? 'guess' : 'question']: childProjection(actionType, child),
    round: projectBrewDoneItRound(round, round.guesser_participant_id),
    ...(replayed ? { replayed: true } : {})
  })
}

const ensureActionReplay = async (round, actionType, requestKey, response) => {
  const existing = await findActionByKey(round.id, actionType, requestKey)
  if (!existing) return false
  if (existing.action_state === ACTION_DISCARDED) {
    throw gameError('The earlier action was not accepted. Refresh and submit it as a new action.', 409, 'ACTION_DISCARDED')
  }
  if (existing.action_state === ACTION_PENDING) {
    round = await reconcileRoundActions(round)
  }
  const persisted = await findActionByKey(round.id, actionType, requestKey)
  if (!persisted || persisted.action_state !== ACTION_COMMITTED) {
    throw gameError('The earlier action could not be reconciled.', 409, 'ACTION_RECOVERY_REQUIRED')
  }
  await actionResponse(response, actionType, persisted, round, true)
  return true
}

export const submitSafeGuess = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  let { round, game } = await getRound(roundId, user)
  if (String(round.guesser_participant_id) !== String(user.id)) throw gameError('Only the guesser can submit a beer guess.')
  round = await reconcileRoundActions(round)

  const requestKey = `${user.id}:${idempotencyKey}`
  if (await ensureActionReplay(round, ACTION_GUESS, requestKey, response)) return
  if (game.status !== 'active' || round.status !== 'guessing' || !round.selected_product_id) {
    throw gameError('This round is not accepting guesses.', 409)
  }
  if (Number(round.version || 0) !== expectedVersion) throw versionConflict(round)

  const { productId } = sanitiseBrewDoneItGuessInput(request.body)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw gameError('Product not found.', 404)
  const previous = await committedChildren(COLLECTIONS.brewDoneItGuesses, round.id)
  if (previous.some((guess) => String(guess.guessed_product_id) === String(productId))) {
    throw gameError('This beer has already been guessed.', 409)
  }

  const correct = String(productId) === String(round.selected_product_id)
  const turnSequence = Number(round.turn_sequence || 0) + 1
  const now = new Date().toISOString()
  const reserved = await reserveAction(round, expectedVersion, requestKey, ACTION_GUESS)

  let created
  try {
    created = firstRecord(await dataProvider.create(COLLECTIONS.brewDoneItGuesses, {
      round_id: round.id,
      turn_sequence: turnSequence,
      guessed_product_id: productId,
      guesser_participant_id: user.id,
      is_correct: correct,
      uniqueness_key: `${round.id}:${productId}:${requestKey}`,
      idempotency_key: requestKey,
      action_state: ACTION_PENDING,
      committed_round_version: null,
      created_at: now
    }))
  } catch (error) {
    created = await recoverCreateResult(reserved, ACTION_GUESS, requestKey, error)
  }

  const finalised = await finaliseReservedAction(reserved, ACTION_GUESS, created)
  const committed = await setChildState(ACTION_GUESS, created, ACTION_COMMITTED, finalised.version)
  await actionResponse(response, ACTION_GUESS, committed, finalised)
}

export const askSafeQuestion = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  let { round, game } = await getRound(roundId, user)
  if (String(round.guesser_participant_id) !== String(user.id)) throw gameError('Only the guesser can ask a question.')
  round = await reconcileRoundActions(round)

  const requestKey = `${user.id}:${idempotencyKey}`
  if (await ensureActionReplay(round, ACTION_QUESTION, requestKey, response)) return
  if (game.status !== 'active' || round.status !== 'guessing' || !round.selected_product_id) {
    throw gameError('This round is not accepting questions.', 409)
  }
  if (Number(round.version || 0) !== expectedVersion) throw versionConflict(round)
  if (Number(round.question_count || 0) >= BREW_DONE_IT_RULES.maxQuestions) {
    throw gameError('This round has no remaining questions.', 409)
  }

  const question = sanitiseBrewDoneItQuestionInput(request.body)
  const previous = await committedChildren(COLLECTIONS.brewDoneItQuestions, round.id)
  if (previous.some((item) => questionKey({
    questionType: item.question_type,
    referenceId: item.reference_id,
    threshold: item.threshold
  }) === questionKey(question))) throw gameError('This question has already been asked.', 409)

  const targetProduct = await dataProvider.get(COLLECTIONS.products, round.selected_product_id)
  if (!targetProduct) throw gameError('The selected product cannot be resolved.', 409)
  const answer = await answerQuestion(question, targetProduct)
  const turnSequence = Number(round.turn_sequence || 0) + 1
  const now = new Date().toISOString()
  const reserved = await reserveAction(round, expectedVersion, requestKey, ACTION_QUESTION)

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
      uniqueness_key: `${round.id}:${questionKey(question)}:${requestKey}`,
      idempotency_key: requestKey,
      action_state: ACTION_PENDING,
      committed_round_version: null,
      created_at: now
    }))
  } catch (error) {
    created = await recoverCreateResult(reserved, ACTION_QUESTION, requestKey, error)
  }

  const finalised = await finaliseReservedAction(reserved, ACTION_QUESTION, created)
  const committed = await setChildState(ACTION_QUESTION, created, ACTION_COMMITTED, finalised.version)
  await actionResponse(response, ACTION_QUESTION, committed, finalised)
}

export const showSafeGame = async (gameId, response, user) => {
  const game = await getGame(gameId, user)
  const rounds = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
    .sort((left, right) => Number(left.round_number) - Number(right.round_number))

  const projectedRounds = []
  for (const sourceRound of rounds) {
    const round = await reconcileRoundActions(sourceRound)
    const [guesses, questions] = await Promise.all([
      committedChildren(COLLECTIONS.brewDoneItGuesses, round.id),
      committedChildren(COLLECTIONS.brewDoneItQuestions, round.id)
    ])
    projectedRounds.push({
      ...projectBrewDoneItRound(round, user.id),
      guesses: guesses
        .sort((left, right) => Number(left.turn_sequence) - Number(right.turn_sequence))
        .map(projectBrewDoneItGuess),
      questions: questions
        .sort((left, right) => Number(left.turn_sequence) - Number(right.turn_sequence))
        .map(projectBrewDoneItQuestion)
    })
  }

  response.status(200).json({ game: projectBrewDoneItGame(game), rounds: projectedRounds })
}

export const __testables = {
  ACTION_PENDING,
  ACTION_COMMITTED,
  ACTION_DISCARDED,
  ACTION_GUESS,
  ACTION_QUESTION,
  transitionInput,
  getGame,
  getRound,
  reserveAction,
  finaliseReservedAction,
  reconcileRoundActions,
  findActionByKey,
  pendingChildren,
  submitSafeGuess,
  askSafeQuestion,
  showSafeGame
}
