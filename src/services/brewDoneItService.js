import { apiRequest } from '../lib/nocodeBackend.js'

const gamePath = (gameId) => `/brew-done-it/games/${encodeURIComponent(gameId)}`
const roundPath = (roundId) => `/brew-done-it/rounds/${encodeURIComponent(roundId)}`
const mutationBody = (expectedVersion, idempotencyKey, values = {}) => ({
  ...values,
  expectedVersion,
  idempotencyKey
})

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

export const submitBrewDoneItGuess = (roundId, productId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/guesses`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { productId })
  })

export const askBrewDoneItQuestion = (roundId, question, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/questions`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, question)
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
