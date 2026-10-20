import assert from 'node:assert/strict'
import test from 'node:test'
import { extractSessionUser, requireSessionUser, __testables } from '../authSession.js'
import { UPSTREAM_TIMEOUT_MS } from '../httpSecurity.js'

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

const configureSession = (context) => {
  for (const [key, value] of Object.entries({
    NOCODEBACKEND_AUTH_SECRET_KEY: 'test-auth-secret',
    NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth'
  })) {
    const previous = process.env[key]
    process.env[key] = value
    context.after(() => {
      if (previous === undefined) delete process.env[key]
      else process.env[key] = previous
    })
  }
}

test('session lookup aborts a stalled JSON body within the original request deadline', async (context) => {
  configureSession(context)
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let requestSignal, bodyStarted
  const reading = new Promise((resolve) => { bodyStarted = resolve })
  context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    requestSignal = signal
    context.mock.timers.tick(UPSTREAM_TIMEOUT_MS - 1)
    return {
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        bodyStarted()
      })
    }
  })

  const pending = requireSessionUser({ headers: {} })
  const rejected = assert.rejects(pending, { name: 'AbortError' })
  await reading
  assert.equal(requestSignal.aborted, false)
  context.mock.timers.tick(1)
  assert.equal(requestSignal.aborted, true)
  await rejected
})

test('completed session bodies clear the timeout and malformed JSON remains unauthenticated', async (context) => {
  configureSession(context)
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let requestSignal
  context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    requestSignal = signal
    return { ok: true, json: async () => ({ user: { id: 'user-1' } }) }
  })
  assert.equal((await requireSessionUser({ headers: {} })).id, 'user-1')
  context.mock.timers.tick(UPSTREAM_TIMEOUT_MS)
  assert.equal(requestSignal.aborted, false)

  globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON') } })
  await assert.rejects(requireSessionUser({ headers: {} }), { status: 401 })
})

test('caller cancellation aborts session body reads before the upstream timeout', async (context) => {
  configureSession(context)
  const caller = new AbortController()
  let requestSignal, bodyStarted
  const reading = new Promise((resolve) => { bodyStarted = resolve })
  context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    requestSignal = signal
    return {
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        bodyStarted()
      })
    }
  })
  const pending = requireSessionUser({ headers: {} }, { signal: caller.signal })
  const rejected = assert.rejects(pending, { name: 'AbortError' })
  await reading
  caller.abort()
  assert.equal(requestSignal.aborted, true)
  await rejected
})

test('an expired caller prevents session fetch and cannot acknowledge a late user body', async (context) => {
  configureSession(context)
  const caller = new AbortController()
  caller.abort()
  context.mock.method(globalThis, 'fetch', async () => assert.fail('cancelled authentication must not fetch'))
  await assert.rejects(requireSessionUser({ headers: {} }, { signal: caller.signal }), { name: 'AbortError' })

  const lateCaller = new AbortController()
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => {
      lateCaller.abort()
      return { user: { id: 'late-user' } }
    }
  })
  await assert.rejects(requireSessionUser({ headers: {} }, { signal: lateCaller.signal }), { name: 'AbortError' })
})


