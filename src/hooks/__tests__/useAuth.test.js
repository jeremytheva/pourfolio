import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AUTH_ERROR_CODES,
  normalizeAuthUser,
  resolveAuthenticatedSession
} from '../useAuth.js'

const applyNormalisedSession = async (payload) => {
  const user = normalizeAuthUser(payload)
  return user ? { user } : null
}

test('uses a normalisable authentication response without refreshing the session', async () => {
  let sessionRequests = 0
  const result = await resolveAuthenticatedSession({
    user: { id: 'user-1', email: 'person@example.test' }
  }, {
    applySession: applyNormalisedSession,
    getSession: async () => {
      sessionRequests += 1
      return null
    }
  })

  assert.equal(result.user.id, 'user-1')
  assert.equal(sessionRequests, 0)
})

test('refreshes the session once when an authentication response is only an acknowledgement', async () => {
  let sessionRequests = 0
  const result = await resolveAuthenticatedSession({ accepted: true }, {
    applySession: applyNormalisedSession,
    getSession: async () => {
      sessionRequests += 1
      return { data: { session: { user: { user_id: 42, email: 'person@example.test' } } } }
    }
  })

  assert.equal(result.user.id, '42')
  assert.equal(sessionRequests, 1)
})

test('rejects a successful response when neither it nor the refresh establishes a session', async () => {
  let sessionRequests = 0

  await assert.rejects(
    resolveAuthenticatedSession({ accepted: true }, {
      applySession: applyNormalisedSession,
      getSession: async () => {
        sessionRequests += 1
        return { data: null }
      }
    }),
    (error) => {
      assert.equal(error.code, AUTH_ERROR_CODES.SESSION_MISSING)
      assert.match(error.message, /no authenticated session was established/i)
      return true
    }
  )
  assert.equal(sessionRequests, 1)
})

test('propagates a failed session refresh as an authentication error', async () => {
  const refreshError = new Error('Authentication is required.')

  await assert.rejects(
    resolveAuthenticatedSession({ accepted: true }, {
      applySession: applyNormalisedSession,
      getSession: async () => { throw refreshError }
    }),
    (error) => error === refreshError
  )
})