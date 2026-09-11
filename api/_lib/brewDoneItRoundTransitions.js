import { COLLECTIONS } from '../../src/data/contract.js'
import { calculateBrewDoneItRoundScore } from '../../src/utils/brewDoneItChallengeScoring.js'
import { dataProvider } from './dataProvider.js'
import { reconcileRoundActions } from './brewDoneItActionLedger.js'
import { projectBrewDoneItRound } from './brewDoneItPolicy.js'

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/

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
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw gameError('The expected version is invalid.', 400)
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) throw gameError('The idempotency key is invalid.', 400)
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

export const forfeitSafeRound = async (roundId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = transitionInput(request)
  let round = await dataProvider.get(COLLECTIONS.brewDoneItRounds, parsePositiveId(roundId, 'Round identifier'))
  if (!round) throw gameError('Round not found.', 404)

  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, round.game_id)
  if (!game || !participant(game, user.id)) throw gameError('Game not found.', 404)
  if (!sameParticipants(round, game)) throw gameError('Round participant relationship is invalid.', 409)

  round = await reconcileRoundActions(round)
  const requestKey = `${user.id}:${idempotencyKey}`
  if (round.terminal_idempotency_key === requestKey && round.status === 'forfeited') {
    response.status(200).json({ round: projectBrewDoneItRound(round, user.id), replayed: true })
    return
  }
  if (game.status !== 'active' || round.status !== 'guessing') throw gameError('Only an active round can be forfeited.', 409)
  if (Number(round.version || 0) !== expectedVersion) throw versionConflict(round)

  const score = calculateBrewDoneItRoundScore({ correct: false })
  const now = new Date().toISOString()
  try {
    await dataProvider.compareAndSet(COLLECTIONS.brewDoneItRounds, round.id, expectedVersion, {
      status: 'forfeited',
      completion_reason: 'forfeit',
      completed_at: now,
      scoring_rules_version: score.version,
      awarded_points: 0,
      score_breakdown: score.breakdown,
      terminal_idempotency_key: requestKey,
      version: expectedVersion + 1
    })
  } catch (error) {
    if (error?.code !== 'VERSION_CONFLICT') throw error
    throw versionConflict(await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id))
  }

  const persisted = await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id)
  if (!persisted || Number(persisted.version) !== expectedVersion + 1 || persisted.status !== 'forfeited') {
    throw versionConflict(persisted)
  }
  response.status(200).json({ round: projectBrewDoneItRound(persisted, user.id) })
}

export const __testables = {
  transitionInput,
  sameParticipants,
  participant,
  forfeitSafeRound
}
