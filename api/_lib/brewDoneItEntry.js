import crypto from 'node:crypto'
import { COLLECTIONS } from '../../src/data/contract.js'
import { requireSessionUser } from './authSession.js'
import {
  askSafeQuestion,
  reconcileRoundActions,
  showSafeGame,
  submitSafeGuess
} from './brewDoneItActionLedger.js'
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

const pathParts = (request) => Array.isArray(request.query?.path)
  ? request.query.path.map(String)
  : String(request.query?.path || '').split('/').filter(Boolean)

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
    const sourceRound = rounds.at(-1) || null
    const currentRound = sourceRound ? await reconcileRoundActions(sourceRound) : null
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

const routeKind = (request) => {
  const path = pathParts(request)
  if (request.method === 'GET' && path.length === 2 && path[0] === 'brew-done-it' && path[1] === 'games') {
    return { kind: 'series-list' }
  }
  if (request.method === 'GET' && path.length === 3 && path[0] === 'brew-done-it' && path[1] === 'games') {
    return { kind: 'game-detail', id: path[2] }
  }
  if (request.method === 'POST' && path.length === 4 && path[0] === 'brew-done-it' && path[1] === 'rounds') {
    if (path[3] === 'guesses') return { kind: 'guess', id: path[2] }
    if (path[3] === 'questions') return { kind: 'question', id: path[2] }
  }
  return null
}

const runContainedRoute = async (request, response, route) => {
  if (process.env.BREW_DONE_IT_POLICY_ENABLED !== 'true') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }

  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')

  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, {
    key: request.method === 'GET' ? 'brew-data-read' : 'brew-data-write',
    limit: request.method === 'GET' ? 120 : 60
  })) return
  if (route.kind === 'question' && !enforceRateLimit(request, response, {
    key: `brew-question:${route.id}`,
    limit: 20,
    windowMs: 60_000
  })) return

  try {
    const user = await requireSessionUser(request)
    if (route.kind === 'series-list') return listParticipantSeries(response, user)
    if (route.kind === 'game-detail') return showSafeGame(route.id, response, user)
    if (route.kind === 'guess') return submitSafeGuess(route.id, request, response, user)
    if (route.kind === 'question') return askSafeQuestion(route.id, request, response, user)
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

export default async function brewDoneItEntry(request, response) {
  const route = routeKind(request)
  if (!route) return brewDoneItHandler(request, response)
  return runContainedRoute(request, response, route)
}

export const __testables = {
  invitationCodeFor,
  pathParts,
  routeKind,
  listParticipantSeries,
  runContainedRoute
}
