import crypto from 'node:crypto'
import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'
import { reconcileOutcomeRound } from './brewDoneItOutcomeGame.js'
import { projectBrewDoneItGame, projectBrewDoneItGuess, projectBrewDoneItRound } from './brewDoneItPolicy.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .filter((value) => value !== null && value !== undefined).some((value) => String(value) === String(userId))
const fail = (message, status = 404) => Object.assign(new Error(message), { status })
const positiveId = (value, label) => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) throw fail(`${label} is invalid.`, 400)
  return text
}

const invitationCodeFor = (creationKey) => {
  const signingKey = process.env.BREW_DONE_IT_INVITATION_KEY || process.env.NOCODEBACKEND_SECRET_KEY
  if (!signingKey || !creationKey) return null
  return crypto.createHmac('sha256', signingKey).update(String(creationKey)).digest('base64url')
}

const safeRound = async (round) => {
  if (!round) return null
  if (round.pending_action_key && String(round.pending_action_type || '').startsWith('outcome:')) {
    return reconcileOutcomeRound(round)
  }
  return round
}

const committedGuesses = async (roundId) => list(await dataProvider.list(COLLECTIONS.brewDoneItGuesses, { round_id: roundId }))
  .filter((guess) => !guess.action_state || guess.action_state === 'committed')
  .sort((left, right) => Number(left.turn_sequence || 0) - Number(right.turn_sequence || 0))
  .map(projectBrewDoneItGuess)

const getParticipantGame = async (gameId, user) => {
  const game = await dataProvider.get(COLLECTIONS.brewDoneItGames, positiveId(gameId, 'Game identifier'))
  if (!game || !participant(game, user.id)) throw fail('Game not found.')
  return game
}

export const listParticipantSeriesV3 = async (response, user) => {
  const [created, joined] = await Promise.all([
    dataProvider.list(COLLECTIONS.brewDoneItGames, { creator_participant_id: user.id }),
    dataProvider.list(COLLECTIONS.brewDoneItGames, { opponent_participant_id: user.id })
  ])
  const byId = new Map()
  for (const game of [...list(created), ...list(joined)]) {
    if (game?.id !== undefined && game?.id !== null) byId.set(String(game.id), game)
  }

  const series = await Promise.all([...byId.values()].map(async (game) => {
    const rounds = list(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
      .sort((left, right) => Number(left.round_number || 0) - Number(right.round_number || 0))
    const currentRound = await safeRound(rounds.at(-1) || null)
    const result = {
      game: projectBrewDoneItGame(game),
      round: currentRound ? projectBrewDoneItRound(currentRound, user.id) : null
    }
    if (game.status === 'waiting' && String(game.creator_participant_id) === String(user.id)) {
      result.invitationCode = invitationCodeFor(game.creation_idempotency_key)
    }
    return result
  }))

  series.sort((left, right) => {
    const rightTime = Date.parse(right.game.last_activity_at || right.game.created_at || 0) || 0
    const leftTime = Date.parse(left.game.last_activity_at || left.game.created_at || 0) || 0
    return rightTime - leftTime
  })
  response.status(200).json({ series })
}

export const showGameV3 = async (gameId, response, user) => {
  const game = await getParticipantGame(gameId, user)
  const rounds = list(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
    .sort((left, right) => Number(left.round_number || 0) - Number(right.round_number || 0))

  const projectedRounds = await Promise.all(rounds.map(async (source) => {
    const round = await safeRound(source)
    return {
      ...projectBrewDoneItRound(round, user.id),
      guesses: await committedGuesses(round.id)
    }
  }))

  response.status(200).json({ game: projectBrewDoneItGame(game), rounds: projectedRounds })
}

export const __testables = { invitationCodeFor, safeRound, committedGuesses }
