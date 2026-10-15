import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../../../auth-proxy.js'
import { UPSTREAM_TIMEOUT_MS } from '../../../_lib/httpSecurity.js'

const TEST_INSTANCE = 'test-instance'
const originalInstance = process.env.NOCODEBACKEND_INSTANCE

test.beforeEach(() => { process.env.NOCODEBACKEND_INSTANCE = TEST_INSTANCE })
test.after(() => {
  if (originalInstance === undefined) delete process.env.NOCODEBACKEND_INSTANCE
  else process.env.NOCODEBACKEND_INSTANCE = originalInstance
})

test('authentication proxy exposes only explicit actions', () => {
  assert.deepEqual(__testables.AUTH_ACTIONS['sign-in/email'], ['POST'])
  assert.equal(__testables.AUTH_ACTIONS['arbitrary/admin'], undefined)
})

test('catch-all path parsing preserves only requested action segments', () => {
  assert.equal(__testables.getRequestPath({ query: { path: ['sign-in', 'email'] } }), 'sign-in/email')
})

test('authentication upstream URLs use the lowercase runtime auth instance selector', () => {
  const request = { query: {}, headers: { host: 'pourfolio.example' } }
  for (const action of ['providers', 'get-session', 'sign-in/email']) {
    const url = __testables.buildUpstreamUrl(request, action)
    assert.equal(url.searchParams.get('instance'), TEST_INSTANCE)
    assert.equal(url.searchParams.has('Instance'), false)
    assert.equal(url.pathname.endsWith(`/api/user-auth/${action}`), true)
  }
})

test('authentication upstream requests also carry the runtime database instance header', () => {
  const headers = __testables.buildUpstreamHeaders({ headers: { cookie: 'session=abc' } }, 'server-secret')
  assert.equal(headers['x-database-instance'], TEST_INSTANCE)
  assert.equal(headers.authorization, 'Bearer server-secret')
  assert.equal(headers.cookie, 'session=abc')
})

test('authentication proxy helpers fail closed without a runtime instance', () => {
  delete process.env.NOCODEBACKEND_INSTANCE
  const request = { query: {}, headers: { host: 'pourfolio.example' } }
  assert.throws(() => __testables.buildUpstreamUrl(request, 'providers'), { status: 503, code: 'AUTH_INSTANCE_MISSING' })
  assert.throws(() => __testables.buildUpstreamHeaders(request, 'server-secret'), { status: 503, code: 'AUTH_INSTANCE_MISSING' })
})

test('provider discovery exposes only enabled-provider state to the browser', () => {
  const safeBody = __testables.sanitizeProviderBody(Buffer.from(JSON.stringify({
    providers: { email: true, google: false },
    baseUrl: 'https://provider.example.test/api/user-auth',
    requiredHeaders: {
      'X-Database-Instance': 'example-instance',
      Authorization: 'Bearer <SECRET_KEY>'
    }
  })))

  assert.deepEqual(JSON.parse(safeBody.toString('utf8')), {
    providers: { email: true, google: false }
  })
  assert.equal(__testables.sanitizeProviderBody(Buffer.from('{"baseUrl":"private"}')), null)
})

test('Google redirect targets must match the current request host', () => {
  const request = { headers: { host: 'pourfolio.example' } }
  assert.equal(__testables.safeRedirectTarget(request, 'https://pourfolio.example/profile'), 'https://pourfolio.example')
  assert.equal(__testables.safeRedirectTarget(request, 'https://attacker.example'), null)
})

test('Google auth keeps the safe same-origin redirect and lowercase auth instance selector', () => {
  const request = {
    headers: { host: 'pourfolio.example' },
    query: { redirectTo: 'https://pourfolio.example/profile' }
  }
  const url = __testables.buildUpstreamUrl(request, 'sign-in/google')
  assert.equal(url.searchParams.get('redirectTo'), 'https://pourfolio.example')
  assert.equal(url.searchParams.get('instance'), TEST_INSTANCE)
  assert.equal(url.searchParams.has('Instance'), false)
})

test('session cookies are scoped to the Pourfolio host and root path', () => {
  const cookie = __testables.secureCookie(
    'session=abc; Domain=app.nocodebackend.com; Path=/api/user-auth; Max-Age=3600'
  )

  assert.doesNotMatch(cookie, /Domain=/i)
  assert.doesNotMatch(cookie, /Path=\/api\/user-auth/i)
  assert.match(cookie, /Path=\//)
  assert.match(cookie, /Max-Age=3600/)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Lax/)
})

test('session cookie normalisation preserves an explicit SameSite policy', () => {
  const cookie = __testables.secureCookie('session=abc; SameSite=None; Secure')

  assert.match(cookie, /SameSite=None/)
  assert.equal((cookie.match(/;\s*Secure/gi) || []).length, 1)
})

test('combined Set-Cookie fallback does not split an Expires date', () => {
  const cookies = __testables.splitSetCookieHeader(
    'session=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/api/user-auth, refresh=def; Path=/api/user-auth'
  )

  assert.deepEqual(cookies, [
    'session=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/api/user-auth',
    'refresh=def; Path=/api/user-auth'
  ])
})

for (const status of [200, 403]) {
  test(`authentication proxy ${status} body consumption keeps the original request deadline`, async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] })
    let requestSignal, bodyStarted
    const reading = new Promise((resolve) => { bodyStarted = resolve })
    context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
      requestSignal = signal
      context.mock.timers.tick(UPSTREAM_TIMEOUT_MS - 1)
      return {
        status,
        arrayBuffer: () => new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
          bodyStarted()
        })
      }
    })

    const pending = __testables.fetchUpstreamResponse({ method: 'GET', headers: {} }, 'providers', 'test-secret')
    const rejected = assert.rejects(pending, { name: 'AbortError' })
    await reading
    assert.equal(requestSignal.aborted, false)
    context.mock.timers.tick(1)
    assert.equal(requestSignal.aborted, true)
    await rejected
  })
}

test('authentication proxy clears its timeout after buffered bodies and preserves manual redirects', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const signals = []
  const body = new ArrayBuffer(0)
  context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signals.push(signal)
    return { status: 200, arrayBuffer: async () => body }
  })
  const request = { method: 'GET', headers: {} }
  assert.equal((await __testables.fetchUpstreamResponse(request, 'providers', 'test-secret')).body, body)

  globalThis.fetch = async (_url, { signal, redirect }) => {
    signals.push(signal)
    assert.equal(redirect, 'manual')
    return { status: 302, arrayBuffer: () => assert.fail('redirect body must not be buffered') }
  }
  const result = await __testables.fetchUpstreamResponse(request, 'sign-in/google', 'test-secret')
  assert.equal(result.upstream.status, 302)
  assert.equal(result.body, null)
  context.mock.timers.tick(UPSTREAM_TIMEOUT_MS)
  assert.equal(signals.every((signal) => !signal.aborted), true)
})

