import crypto from 'node:crypto'
import { COLLECTIONS } from '../../src/data/contract.js'
import { requireSessionUser } from './authSession.js'
import brewDoneItHandler from './brewDoneItGateway.js'
import { dataProvider } from './dataProvider.js'
import {
  projectBrewDoneItGame,
  projectBrewDoneItRound
} from './brewDoneItPolicy.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from './httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './telemetry.js'

const normaliseList = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .filter((item) => item && typeof item === 'object')

const invitationCodeFor = (creationKey) => {
  const signingKey = process.env.BREW_DONE_IT_INVITATION_KEY || process.env.NOCODEBACKEND_SECRET_KEY
  if (!signingKey || !creationKey) return null
  return crypto.createHmac('sha256', signingKey).update(String(creationKey)).digest('base64url')
}

const listParticipantSeries = async (response, user) => {
  const [created, joined] = await Promise.all([
    dataProvider.list(COLLECTIONS.brewDoneItGames, { creator_participant_id: user.id }),
    dataProvider.list(COLLECTIONS.brewDoneItGames, { opponent_participant_id: user.id })
  ])

  const byId = new Map()
  for (const game of [...normaliseList(created), ...normaliseList(joined)]) {
    if (game?.id !== undefined && game?.id !== null) byId.set(String(game.id), game)
  }

  const series = await Promise.all([...byId.values()].map(async (game) => {
    const rounds = normaliseList(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id }))
      .sort((left, right) => Number(left.round_number || 0) - Number(right.round_number || 0))
    const currentRound = rounds.at(-1) || null
    const projected = {
      game: projectBrewDoneItGame(game),
      round: currentRound ? projectBrewDoneItRound(currentRound, user.id) : null
    }

    if (game.status === 'waiting' && String(game.creator_participant_id) === String(user.id)) {
      projected.invitationCode = invitationCodeFor(game.creation_idempotency_key)
    }
    return projected
  }))

  series.sort((left, right) => {
    const rightTime = Date.parse(right.game.last_activity_at || right.game.created_at || 0) || 0
    const leftTime = Date.parse(left.game.last_activity_at || left.game.created_at || 0) || 0
    return rightTime - leftTime
  })

  response.status(200).json({ series })
}

const isSeriesListRequest = (request) => {
  if (request.method !== 'GET') return false
  const path = Array.isArray(request.query?.path)
    ? request.query.path.map(String)
    : String(request.query?.path || '').split('/').filter(Boolean)
  return path.length === 2 && path[0] === 'brew-done-it' && path[1] === 'games'
}

export default async function brewDoneItEntry(request, response) {
  if (!isSeriesListRequest(request)) return brewDoneItHandler(request, response)

  if (process.env.BREW_DONE_IT_POLICY_ENABLED !== 'true') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }

  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')

  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, { key: 'brew-series-read', limit: 120 })) return

  try {
    const user = await requireSessionUser(request)
    await listParticipantSeries(response, user)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/brew-done-it/games',
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
  invitationCodeFor,
  isSeriesListRequest,
  listParticipantSeries
}
