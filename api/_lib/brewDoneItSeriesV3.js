import crypto from 'node:crypto'
import { COLLECTIONS } from '../../src/data/contract.js'
import { BREW_DONE_IT_RULES } from '../../src/utils/brewDoneItChallengeScoring.js'
import { dataProvider } from './dataProvider.js'
import { listAllBrewDoneItRecords } from './brewDoneItData.js'
import {
  projectBrewDoneItGame,
  projectBrewDoneItRound,
  sanitiseBrewDoneItCreateInput,
  sanitiseBrewDoneItJoinInput
} from './brewDoneItPolicy.js'

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u
const TERMINAL_ROUND_STATES = new Set(['completed', 'forfeited'])

const list = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .filter((item) => item && typeof item === 'object')
const first = (value) => list(value)[0] || value || null
const fail = (message, status = 400, code = null, currentVersion = null) => {
  const error = Object.assign(new Error(message), { status })
  if (code) error.payload = {
    error: message,
    code,
    ...(currentVersion === null ? {} : { currentVersion })
  }
  return error
}
const positiveId = (value, label) => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/u.test(text)) throw fail(`${label} is invalid.`)
  return text
}
const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .some((value) => value !== null && value !== undefined && String(value) === String(userId))

const mutation = (request) => {
  const expectedVersion = Number(request.body?.expectedVersion)
  const idempotencyKey = String(request.body?.idempotencyKey || '').trim()
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw fail('The expected version is invalid.')
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) throw fail('The idempotency key is invalid.')
  return { expectedVersion, idempotencyKey }
}

const versionConflict = (record) => fail(
  'The game changed before this request was applied.',
  409,
  'VERSION_CONFLICT',
  Number(record?.version || 0)
)
const idempotencyConflict = () => fail(
  'This request key has already been used for different Brew Done It challenge data.',
  409,
  'IDEMPOTENCY_CONFLICT'
)

const compareAndSet = async (collection, record, expectedVersion, updates) => {
  if (Number(record?.version || 0) !== expectedVersion) throw versionConflict(record)
  try {
    await dataProvider.compareAndSet(collection, record.id, expectedVersion, {
      ...updates,
      version: expectedVersion + 1
    })
  } catch (error) {
    const refreshed = await dataProvider.get(collection, record.id).catch(() => null)
    if (error?.code === 'VERSION_CONFLICT') throw versionConflict(refreshed || record)
    throw error
  }
  const saved = await dataProvider.get(collection, record.id)
  if (Number(saved?.version || 0) !== expectedVersion + 1) throw versionConflict(saved)
  return saved
}

const signingKey = () => {
  const key = process.env.BREW_DONE_IT_INVITATION_KEY || process.env.NOCODEBACKEND_SECRET_KEY
  if (!key) throw fail('The game invitation service is not configured.', 503)
  return key
}
const invitationCodeFor = (creationKey) => crypto.createHmac('sha256', signingKey()).update(creationKey).digest('base64url')
const invitationDigest = (code) => crypto.createHash('sha256').update(code).digest('hex')
const creationRequestFingerprint = (creationKey, productId) => crypto
  .createHmac('sha256', signingKey())
  .update(`create:${creationKey}:${productId}`)
  .digest('hex')

const roundsFor = async (gameId) => list(await listAllBrewDoneItRecords(COLLECTIONS.brewDoneItRounds, { game_id: gameId }))
  .sort((left, right) => Number(left.round_number || 0) - Number(right.round_number || 0))

const initialRoundBody = (game, productId, createdAt) => ({
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
  incorrect_formal_guess_count: 0,
  brewery_correct: false,
  style_correct: false,
  beer_correct: false,
  pending_action_key: null,
  pending_action_type: null,
  pending_action_started_at: null,
  last_action_key: null,
  last_action_type: null,
  created_at: createdAt,
  started_at: game.opponent_participant_id ? game.joined_at || createdAt : null,
  completed_at: null,
  completion_reason: null,
  scoring_rules_version: null,
  awarded_points: null,
  score_breakdown: null,
  version: 0
})

const ensureInitialRound = async (game, productId, createdAt) => {
  const findPersisted = async () => list(await dataProvider.list(COLLECTIONS.brewDoneItRounds, {
    game_id: game.id,
    round_number: 1
  }))[0] || null
  const existing = await findPersisted()
  if (existing) {
    if (String(existing.selected_product_id) !== String(productId)) throw idempotencyConflict()
    return existing
  }

  try {
    const created = first(await dataProvider.create(COLLECTIONS.brewDoneItRounds, initialRoundBody(game, productId, createdAt)))
    if (!created?.id) throw fail('The game service did not return an opening round identifier.', 502)
    return created
  } catch (error) {
    const persisted = await findPersisted()
    if (!persisted) throw error
    if (String(persisted.selected_product_id) !== String(productId)) throw idempotencyConflict()
    return persisted
  }
}

const gameByCreationKey = async (creationKey) => list(await dataProvider.list(COLLECTIONS.brewDoneItGames, {
  creation_idempotency_key: creationKey
}))[0] || null

export const createGameV3 = async (request, response, user) => {
  const { expectedVersion, idempotencyKey } = mutation(request)
  if (expectedVersion !== 0) throw versionConflict({ version: 0 })
  const { productId } = sanitiseBrewDoneItCreateInput(request.body)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw fail('Product not found.', 404)

  const creationKey = `${user.id}:${idempotencyKey}`
  const fingerprint = creationRequestFingerprint(creationKey, productId)
  const invitationCode = invitationCodeFor(creationKey)
  let game = await gameByCreationKey(creationKey)

  if (game) {
    if (String(game.creator_participant_id) !== String(user.id)) throw idempotencyConflict()
    if (game.creation_request_fingerprint && game.creation_request_fingerprint !== fingerprint) throw idempotencyConflict()
    const existingRounds = await roundsFor(game.id)
    const openingRound = existingRounds.find((round) => Number(round.round_number) === 1)
    if (!game.creation_request_fingerprint && (!openingRound || String(openingRound.selected_product_id) !== String(productId))) {
      throw idempotencyConflict()
    }
    const round = openingRound || await ensureInitialRound(game, productId, game.created_at || new Date().toISOString())
    response.status(200).json({
      game: projectBrewDoneItGame(game),
      round: projectBrewDoneItRound(round, user.id),
      invitationCode,
      replayed: true
    })
    return
  }

  const now = new Date().toISOString()
  const gameBody = {
    creator_participant_id: user.id,
    opponent_participant_id: null,
    creator_history_clues_enabled: false,
    opponent_history_clues_enabled: false,
    invitation_digest: invitationDigest(invitationCode),
    status: 'waiting',
    current_round_number: 1,
    version: 0,
    creation_idempotency_key: creationKey,
    creation_request_fingerprint: fingerprint,
    expires_at: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
    created_at: now,
    joined_at: null,
    last_activity_at: now,
    archived_at: null
  }

  try {
    game = first(await dataProvider.create(COLLECTIONS.brewDoneItGames, gameBody))
  } catch (error) {
    game = await gameByCreationKey(creationKey)
    if (!game) throw error
  }
  if (!game?.id) throw fail('The game service did not return a game identifier.', 502)
  if (game.creation_request_fingerprint !== fingerprint) throw idempotencyConflict()

  try {
    const round = await ensureInitialRound(game, productId, game.created_at || now)
    response.status(201).json({
      game: projectBrewDoneItGame(game),
      round: projectBrewDoneItRound(round, user.id),
      invitationCode
    })
  } catch (error) {
    try {
      await dataProvider.remove(COLLECTIONS.brewDoneItGames, game.id)
    } catch {
      // Best-effort rollback only; the original round-creation error remains authoritative.
    }
    throw error
  }
}

export const joinGameV3 = async (gameId, request, response, user) => {
  const { idempotencyKey } = mutation(request)
  const id = positiveId(gameId, 'Game identifier')
  const { inviteCode } = sanitiseBrewDoneItJoinInput(request.body)
  const digest = invitationDigest(inviteCode)
  const requestKey = `${user.id}:${idempotencyKey}`
  let game = await dataProvider.get(COLLECTIONS.brewDoneItGames, id)

  if (game?.join_idempotency_key === requestKey && String(game.opponent_participant_id) === String(user.id)) {
    if (game.invitation_digest !== digest) throw idempotencyConflict()
    const round = (await roundsFor(game.id)).find((item) => Number(item.round_number) === 1)
    if (!round) throw fail('The opening round is unavailable.', 409)
    let persistedRound = round
    if (String(round.guesser_participant_id || '') !== String(user.id) || round.status === 'waiting_for_opponent') {
      try {
        persistedRound = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, Number(round.version || 0), {
          guesser_participant_id: user.id,
          status: 'guessing',
          started_at: round.started_at || game.joined_at || new Date().toISOString()
        })
      } catch (error) {
        const refreshed = await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id)
        if (String(refreshed?.guesser_participant_id) !== String(user.id) || refreshed?.status !== 'guessing') throw error
        persistedRound = refreshed
      }
    }
    response.status(200).json({ game: projectBrewDoneItGame(game), round: projectBrewDoneItRound(persistedRound, user.id), replayed: true })
    return
  }

  if (!game || game.invitation_digest !== digest) throw fail('Game invitation is invalid.', 404)
  if (!Number.isFinite(Date.parse(game.expires_at)) || Date.parse(game.expires_at) <= Date.now()) throw fail('Game invitation has expired.', 409)
  if (game.status !== 'waiting' || game.opponent_participant_id) throw fail('Game invitation is no longer available.', 409)
  if (String(game.creator_participant_id) === String(user.id)) throw fail('The challenge creator cannot join as the opponent.', 409)

  const joinedAt = new Date().toISOString()
  const joinVersion = Number(game.version || 0)
  try {
    game = await compareAndSet(COLLECTIONS.brewDoneItGames, game, joinVersion, {
      opponent_participant_id: user.id,
      status: 'active',
      joined_at: joinedAt,
      last_activity_at: joinedAt,
      invitation_digest: digest,
      join_idempotency_key: requestKey
    })
  } catch (error) {
    const refreshed = await dataProvider.get(COLLECTIONS.brewDoneItGames, id)
    if (refreshed?.join_idempotency_key !== requestKey || String(refreshed?.opponent_participant_id) !== String(user.id) || refreshed?.invitation_digest !== digest) throw error
    game = refreshed
  }

  const round = (await roundsFor(game.id)).find((item) => Number(item.round_number) === 1)
  if (!round) throw fail('The opening round is unavailable.', 409)
  let persistedRound
  try {
    persistedRound = await compareAndSet(COLLECTIONS.brewDoneItRounds, round, Number(round.version || 0), {
      guesser_participant_id: user.id,
      status: 'guessing',
      started_at: round.started_at || joinedAt
    })
  } catch (error) {
    const refreshed = await dataProvider.get(COLLECTIONS.brewDoneItRounds, round.id)
    if (String(refreshed?.guesser_participant_id) !== String(user.id) || refreshed?.status !== 'guessing') throw error
    persistedRound = refreshed
  }
  response.status(200).json({ game: projectBrewDoneItGame(game), round: projectBrewDoneItRound(persistedRound, user.id) })
}

const nextRoundBody = ({ game, previous, productId, requestKey, now }) => ({
  game_id: game.id,
  round_number: Number(previous.round_number) + 1,
  selector_participant_id: previous.guesser_participant_id,
  guesser_participant_id: previous.selector_participant_id,
  selected_product_id: productId,
  status: 'guessing',
  turn_sequence: 0,
  max_turns: BREW_DONE_IT_RULES.maxTurns,
  question_count: 0,
  incorrect_guess_count: 0,
  incorrect_formal_guess_count: 0,
  brewery_correct: false,
  style_correct: false,
  beer_correct: false,
  pending_action_key: null,
  pending_action_type: null,
  pending_action_started_at: null,
  last_action_key: null,
  last_action_type: null,
  created_at: now,
  started_at: now,
  completed_at: null,
  completion_reason: null,
  scoring_rules_version: null,
  awarded_points: null,
  score_breakdown: null,
  round_creation_idempotency_key: requestKey,
  version: 0
})

const canAdoptPersistedRound = (game, rounds, created, userId) => {
  const targetNumber = Number(created?.round_number || 0)
  const predecessorNumber = targetNumber - 1
  if (!game || !created || targetNumber < 2) return false
  if (game.status !== 'active' || !game.opponent_participant_id) return false
  if (Number(game.current_round_number || 0) !== predecessorNumber) return false
  const predecessor = list(rounds).find((round) => Number(round.round_number || 0) === predecessorNumber)
  if (!predecessor || !TERMINAL_ROUND_STATES.has(predecessor.status)) return false
  if (String(created.game_id) !== String(game.id)) return false
  if (String(created.selector_participant_id) !== String(userId)) return false
  if (String(created.selector_participant_id) !== String(predecessor.guesser_participant_id)) return false
  if (String(created.guesser_participant_id) !== String(predecessor.selector_participant_id)) return false
  return true
}

const adoptPersistedRound = async (game, rounds, created, userId) => {
  const targetNumber = Number(created.round_number)
  if (Number(game.current_round_number || 0) === targetNumber) return game
  if (!canAdoptPersistedRound(game, rounds, created, userId)) throw versionConflict(game)

  const updates = {
    current_round_number: targetNumber,
    last_activity_at: created.created_at || new Date().toISOString()
  }
  try {
    return await compareAndSet(COLLECTIONS.brewDoneItGames, game, Number(game.version || 0), updates)
  } catch (error) {
    const refreshed = await dataProvider.get(COLLECTIONS.brewDoneItGames, game.id)
    if (Number(refreshed?.current_round_number || 0) === targetNumber) return refreshed
    if (!canAdoptPersistedRound(refreshed, rounds, created, userId)) throw error
    return compareAndSet(COLLECTIONS.brewDoneItGames, refreshed, Number(refreshed.version || 0), updates)
  }
}

export const createNextRoundV3 = async (gameId, request, response, user) => {
  const { expectedVersion, idempotencyKey } = mutation(request)
  const { productId } = sanitiseBrewDoneItCreateInput(request.body)
  let game = await dataProvider.get(COLLECTIONS.brewDoneItGames, positiveId(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw fail('Game not found.', 404)
  if (game.status !== 'active' || !game.opponent_participant_id) throw fail('This series cannot start another round.', 409)
  if (!await dataProvider.get(COLLECTIONS.products, productId)) throw fail('Product not found.', 404)

  let rounds = await roundsFor(game.id)
  const requestKey = `${user.id}:${idempotencyKey}`
  const replayed = rounds.find((round) => round.round_creation_idempotency_key === requestKey)
  if (replayed) {
    if (String(replayed.selected_product_id) !== String(productId)) throw idempotencyConflict()
    game = await adoptPersistedRound(game, rounds, replayed, user.id)
    response.status(200).json({ game: projectBrewDoneItGame(game), round: projectBrewDoneItRound(replayed, user.id), replayed: true })
    return
  }

  if (Number(game.version || 0) !== expectedVersion) throw versionConflict(game)
  const previous = rounds.at(-1)
  if (!previous || !TERMINAL_ROUND_STATES.has(previous.status)) throw fail('Finish the current round before starting another.', 409)
  if (String(previous.guesser_participant_id) !== String(user.id)) throw fail('It is the other player’s turn to choose the next secret beer.', 403)

  const now = new Date().toISOString()
  const body = nextRoundBody({ game, previous, productId, requestKey, now })
  let created
  try {
    created = first(await dataProvider.create(COLLECTIONS.brewDoneItRounds, body))
  } catch (error) {
    rounds = await roundsFor(game.id)
    const persisted = rounds.find((round) => round.round_creation_idempotency_key === requestKey)
    if (!persisted) throw error
    if (String(persisted.selected_product_id) !== String(productId)) throw idempotencyConflict()
    created = persisted
  }
  if (!created?.id) throw fail('The game service did not return a round identifier.', 502)

  rounds = [...rounds.filter((round) => String(round.id) !== String(created.id)), created]
    .sort((left, right) => Number(left.round_number || 0) - Number(right.round_number || 0))
  game = await adoptPersistedRound(game, rounds, created, user.id)

  response.status(201).json({ game: projectBrewDoneItGame(game), round: projectBrewDoneItRound(created, user.id) })
}

export const __testables = {
  creationRequestFingerprint,
  invitationCodeFor,
  invitationDigest,
  initialRoundBody,
  nextRoundBody,
  canAdoptPersistedRound,
  mutation
}
