import assert from 'node:assert/strict'
import test from 'node:test'
import { getBrewDoneItActionError } from '../brewDoneItActionError.js'

test('version conflicts require refresh instead of replaying a stale action', () => {
  assert.deepEqual(getBrewDoneItActionError({ code: 'VERSION_CONFLICT', status: 409, message: 'stale version' }), {
    message: 'The challenge changed before your action was accepted. Refresh before trying again.',
    retryable: false
  })
})

test('expired invitations are terminal and not replayable', () => {
  assert.equal(getBrewDoneItActionError({ status: 409, message: 'Invitation expired' }).retryable, false)
})

test('network failures remain replayable with the same idempotency key', () => {
  assert.deepEqual(getBrewDoneItActionError({ status: 0, message: 'network error' }), {
    message: 'Brew Done It could not be reached. Check your connection and retry.',
    retryable: true
  })
})

test('business validation failures are shown safely but are not blindly replayed', () => {
  assert.deepEqual(getBrewDoneItActionError({ status: 422, message: 'Choose a different beer.' }), {
    message: 'Choose a different beer.',
    retryable: false
  })
})

test('server and unknown failures can replay the original idempotent action', () => {
  assert.equal(getBrewDoneItActionError({ status: 503, message: 'provider unavailable' }).retryable, true)
  assert.equal(getBrewDoneItActionError(new Error('unexpected')).retryable, true)
})
