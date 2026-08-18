import { apiRequest } from '../lib/nocodeBackend.js'

const gamePath = (gameId) => `/brew-done-it/games/${encodeURIComponent(gameId)}`
const roundPath = (roundId) => `/brew-done-it/rounds/${encodeURIComponent(roundId)}`
const mutationBody = (expectedVersion, idempotencyKey, values = {}) => ({
  ...values,
  expectedVersion,
  idempotencyKey
})

export const createBrewDoneItGame = (historyConsent, idempotencyKey) => apiRequest('/brew-done-it/games', {
  method: 'POST', body: mutationBody(0, idempotencyKey, { historyConsent })
})
export const joinBrewDoneItGame = (gameId, inviteCode, historyConsent, expectedVersion, idempotencyKey) =>
  apiRequest(`${gamePath(gameId)}/join`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { inviteCode, historyConsent })
  })
export const getBrewDoneItGame = (gameId) => apiRequest(gamePath(gameId))
export const selectBrewDoneItProduct = (roundId, productId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/selection`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { productId })
  })
export const submitBrewDoneItGuess = (roundId, guessType, guessId, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/guesses`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { guessType, guessId })
  })
export const askBrewDoneItHistoryQuestion = (roundId, predicate, expectedVersion, idempotencyKey) =>
  apiRequest(`${roundPath(roundId)}/history-questions`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey, { predicate })
  })
export const transitionBrewDoneItGame = (gameId, action, expectedVersion, idempotencyKey) =>
  apiRequest(`${gamePath(gameId)}/${action}`, {
    method: 'POST', body: mutationBody(expectedVersion, idempotencyKey)
  })
export const getBrewDoneItStats = () => apiRequest('/brew-done-it/stats')

export const pollBrewDoneItGame = async (gameId, {
  signal,
  intervalMs = 2_000,
  maxAttempts = 30,
  onRefresh = () => {}
} = {}) => {
  const delay = Math.min(10_000, Math.max(1_000, intervalMs))
  const attempts = Math.min(120, Math.max(1, maxAttempts))
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal?.aborted) return null
    const snapshot = await getBrewDoneItGame(gameId)
    onRefresh(snapshot)
    if (!['waiting', 'active'].includes(snapshot?.game?.status)) return snapshot
    if (attempt + 1 < attempts) await new Promise((resolve) => {
      const timer = window.setTimeout(resolve, delay)
      signal?.addEventListener('abort', () => { window.clearTimeout(timer); resolve() }, { once: true })
    })
  }
  return null
}