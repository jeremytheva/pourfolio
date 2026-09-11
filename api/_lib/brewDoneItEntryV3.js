import crypto from 'node:crypto'
import { requireSessionUser } from './authSession.js'
import { getSelectorClues, listDeductions, recordDeduction } from './brewDoneItDeductionGame.js'
import { getDeductionOptions } from './brewDoneItDeductionOptions.js'
import brewDoneItEntry from './brewDoneItEntry.js'
import { completeDeductionRound, forfeitDeductionRound, setHistoryClueSharing, submitOutcomeGuess } from './brewDoneItOutcomeGame.js'
import { statsForUserV3 } from './brewDoneItStatsV3.js'
import { listParticipantSeriesV3, showGameV3 } from './brewDoneItViewV3.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './telemetry.js'

const pathParts = (request) => Array.isArray(request.query?.path)
  ? request.query.path.map(String)
  : String(request.query?.path || '').split('/').filter(Boolean)

const routeKind = (request) => {
  const path = pathParts(request)
  if (path[0] !== 'brew-done-it') return null
  if (request.method === 'GET' && path.length === 2 && path[1] === 'games') return { kind: 'series-list' }
  if (request.method === 'GET' && path.length === 2 && path[1] === 'options') return { kind: 'options' }
  if (request.method === 'GET' && path.length === 2 && path[1] === 'stats') return { kind: 'stats' }
  if (request.method === 'GET' && path.length === 3 && path[1] === 'games') return { kind: 'game-detail', id: path[2] }
  if (path[1] === 'games' && path.length === 4 && path[3] === 'history-sharing' && request.method === 'POST') return { kind: 'history-sharing', id: path[2] }
  if (path[1] !== 'rounds' || path.length !== 4) return null
  if (path[3] === 'deductions' && request.method === 'GET') return { kind: 'deduction-list', id: path[2] }
  if (path[3] === 'deductions' && request.method === 'POST') return { kind: 'deduction-save', id: path[2] }
  if (path[3] === 'clues' && request.method === 'GET') return { kind: 'clues', id: path[2] }
  if (path[3] === 'outcomes' && request.method === 'POST') return { kind: 'outcome', id: path[2] }
  if (path[3] === 'complete' && request.method === 'POST') return { kind: 'complete', id: path[2] }
  if (path[3] === 'forfeit' && request.method === 'POST') return { kind: 'forfeit', id: path[2] }
  if (['questions', 'guesses'].includes(path[3]) && request.method === 'POST') return { kind: 'superseded' }
  return null
}

const runV3Route = async (request, response, route) => {
  if (process.env.BREW_DONE_IT_POLICY_ENABLED !== 'true') {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, {
    key: request.method === 'GET' ? 'brew-v3-read' : 'brew-v3-write',
    limit: request.method === 'GET' ? 120 : 60
  })) return

  try {
    const user = await requireSessionUser(request)
    if (route.kind === 'series-list') return listParticipantSeriesV3(response, user)
    if (route.kind === 'options') return getDeductionOptions(response, user)
    if (route.kind === 'stats') return statsForUserV3(response, user)
    if (route.kind === 'game-detail') return showGameV3(route.id, response, user)
    if (route.kind === 'history-sharing') return setHistoryClueSharing(route.id, request, response, user)
    if (route.kind === 'deduction-list') return listDeductions(route.id, response, user)
    if (route.kind === 'deduction-save') return recordDeduction(route.id, request, response, user)
    if (route.kind === 'clues') return getSelectorClues(route.id, response, user)
    if (route.kind === 'outcome') return submitOutcomeGuess(route.id, request, response, user)
    if (route.kind === 'complete') return completeDeductionRound(route.id, request, response, user)
    if (route.kind === 'forfeit') return forfeitDeductionRound(route.id, request, response, user)
    if (route.kind === 'superseded') {
      response.status(410).json({ error: 'This action was superseded by the Brew Done It deduction-board model.' })
      return
    }
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/brew-done-it/v3', method: request.method,
        status_class: `${Math.floor(status / 100)}xx`,
        event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure', correlation_id: correlationId
      }))
    }
    response.status(status).json(error.payload || {
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code,
      requestId: correlationId
    })
  }
}

export default async function brewDoneItEntryV3(request, response) {
  const route = routeKind(request)
  if (!route) return brewDoneItEntry(request, response)
  return runV3Route(request, response, route)
}

export const __testables = { pathParts, routeKind, runV3Route }
