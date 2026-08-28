import assert from 'node:assert/strict'
import test from 'node:test'
import { extractSessionUser, __testables } from '../authSession.js'

const TEST_INSTANCE = 'test-instance'
const originalInstance = process.env.NOCODEBACKEND_INSTANCE
const { buildSessionHeaders, buildSessionUrl, requireConfiguredInstance } = __testables

test.beforeEach(() => { process.env.NOCODEBACKEND_INSTANCE = TEST_INSTANCE })
test.after(() => {
  if (originalInstance === undefined) delete process.env.NOCODEBACKEND_INSTANCE
  else process.env.NOCODEBACKEND_INSTANCE = originalInstance
})

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

test('data gateway session lookup uses the runtime NoCodeBackend instance', () => {
  const url = buildSessionUrl()
  assert.equal(url.pathname.endsWith('/get-session'), true)
  assert.equal(url.searchParams.get('instance'), TEST_INSTANCE)
})

test('data gateway session lookup forwards the runtime instance header and session cookie', () => {
  const headers = buildSessionHeaders({ headers: { cookie: 'session=value' } }, 'server-secret')
  assert.equal(headers['x-database-instance'], TEST_INSTANCE)
  assert.equal(headers.authorization, 'Bearer server-secret')
  assert.equal(headers.cookie, 'session=value')
})

test('authentication session lookup fails closed without a runtime instance', () => {
  delete process.env.NOCODEBACKEND_INSTANCE
  assert.throws(() => requireConfiguredInstance(), { status: 503, code: 'AUTH_INSTANCE_MISSING' })
  assert.throws(() => buildSessionUrl(), { status: 503, code: 'AUTH_INSTANCE_MISSING' })
})
