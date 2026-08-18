import assert from 'node:assert/strict'
import test from 'node:test'
import { extractSessionUser } from '../authSession.js'

test('session identity accepts a documented user payload', () => {
  assert.deepEqual(
    extractSessionUser({ user: { id: 'user-1', email: 'person@example.com', name: 'Person' } }),
    { id: 'user-1', email: 'person@example.com', name: 'Person' }
  )
})

test('session identity accepts the documented nested data shape', () => {
  assert.equal(extractSessionUser({ data: { session: { user: { user_id: 'user-2' } } } }).id, 'user-2')
})

test('email alone is never treated as an immutable identity', () => {
  assert.equal(extractSessionUser({ user: { email: 'person@example.com' } }), null)
})

test('unrelated nested identifiers are not recursively scanned', () => {
  assert.equal(extractSessionUser({ data: { unrelated: { id: 'wrong' } } }), null)
})