import assert from 'node:assert/strict'
import test from 'node:test'
import { extractSessionUser, __testables } from '../authSession.js'

const { DATABASE_INSTANCE, buildSessionHeaders, buildSessionUrl } = __testables

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

test('data gateway session lookup uses the same NoCodeBackend database instance as the auth proxy', () => {
  const url = buildSessionUrl()
  assert.equal(url.pathname.endsWith('/get-session'), true)
  assert.equal(url.searchParams.get('instance'), DATABASE_INSTANCE)
})

test('data gateway session lookup forwards the instance header and session cookie', () => {
  const headers = buildSessionHeaders({ headers: { cookie: 'session=value' } }, 'server-secret')
  assert.equal(headers['x-database-instance'], DATABASE_INSTANCE)
  assert.equal(headers.authorization, 'Bearer server-secret')
  assert.equal(headers.cookie, 'session=value')
})
