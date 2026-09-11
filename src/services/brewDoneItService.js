import { apiRequest } from '../lib/nocodeBackend.js'

const gamePath = (gameId) => `/brew-done-it/games/${encodeURIComponent(gameId)}`
const roundPath = (roundId) => `/brew-done-it/rounds/${encodeURIComponent(roundId)}`
const mutationBody = (expectedVersion, idempotencyKey, values = {}) => ({
  ...values,
  expectedVersion,
  idempotencyKey
})

export const getBrewDoneItGames = () => apiRequest('/brew-done-it/games')
export const getBrewDoneItOptions = () => apiRequest('/brew-done-it/options')

export const createBrewDoneItGame = (productId, idempotencyKey) => apiRequest('/brew-done-it/games', {
  method: 'POST', body: mutationBody(0, idempotencyKey, { productId })
})

export const joinBrewDoneItGame = (gameId, inviteCode, expectedVersion, idempotencyKey) =>
  apiRequest(`${gamePath(gameId)}/join`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { inviteCode })
  })

export const getBrewDoneItGame = (gameId) => apiRequest(gamePath(gameId))

export const createBrewDoneItRound = (gameId, productId, expectedVersion, idempotencyKey) =>
  apiRequest(`${gamePath(gameId)}/rounds`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { productId })
  })

export const getBrewDoneItDeductions = (roundId) => apiRequest(`${roundPath(roundId)}/deductions`)

export const saveBrewDoneItDeduction = (roundId, deduction, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/deductions`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, deduction)
  })

export const getBrewDoneItSelectorClues = (roundId) => apiRequest(`${roundPath(roundId)}/clues`)

export const submitBrewDoneItOutcome = (roundId, guessType, referenceId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/outcomes`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { guessType, referenceId })
  })

export const completeBrewDoneItRound = (roundId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/complete`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey)
  })

export const setBrewDoneItHistorySharing = (gameId, enabled, expectedVersion, idempotencyKey) =>
  apiRequest(`${gamePath(gameId)}/history-sharing`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { enabled })
  })

export const forfeitBrewDoneItRound = (roundId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/forfeit`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey)
  })

export const transitionBrewDoneItGame = (gameId, action, expectedVersion, idempotencyKey) =>
  apiRequest(`${gamePath(gameId)}/${action}`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey)
  })

export const getBrewDoneItStats = () => apiRequest('/brew-done-it/stats')

// Superseded v2 exports are retained temporarily for source compatibility only.
export const submitBrewDoneItGuess = (roundId, productId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/guesses`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { productId })
  })

export const askBrewDoneItQuestion = (roundId, question, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/questions`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, question)
  })
