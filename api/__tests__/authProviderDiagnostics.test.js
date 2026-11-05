import assert from 'node:assert/strict'
import test from 'node:test'
import authHandler, { __testables } from '../auth-proxy.js'
import { __resetRateLimitsForTests } from '../_lib/httpSecurity.js'

const {
  buildUpstreamHeaders,
  getRequestBody,
  providerCredentialFailure,
  safeUpstreamAuthError,
  upstreamAuthOrigin
} = __testables

test('only provider bootstrap 401/403 is classified as a provider credential/configuration failure', () => {
  assert.equal(providerCredentialFailure('providers', 401), true)
  assert.equal(providerCredentialFailure('providers', 403), true)

  for (const path of [
    'sign-up/email',
    'sign-in/email',
    'sign-in/otp',
    'verify-otp',
    'sign-in/google',
    'get-session',
    'sign-out'
  ]) {
    assert.equal(providerCredentialFailure(path, 401), false, `${path} 401`)
    assert.equal(providerCredentialFailure(path, 403), false, `${path} 403`)
  }
})

test('provider bootstrap credential failures expose only the safe diagnostic code and request id', () => {
  assert.deepEqual(
    safeUpstreamAuthError('providers', 403, 'request-123'),
    {
      error: 'Authentication service configuration is invalid.',
      code: 'auth_provider_unauthorised',
      requestId: 'request-123'
    }
  )
})

test('sign-up 403 is reported as a provider sign-up rejection rather than a bad secret', () => {
  assert.deepEqual(
    safeUpstreamAuthError('sign-up/email', 403, 'request-456'),
    {
      error: 'The authentication provider rejected sign-up.',
      code: 'auth_signup_rejected',
      requestId: 'request-456'
    }
  )
})

test('non-credential upstream failures retain generic safe errors without the configuration code', () => {
  const result = safeUpstreamAuthError('sign-up/email', 422, 'request-789')
  assert.equal(result.code, undefined)
  assert.equal(result.requestId, 'request-789')
  assert.equal(typeof result.error, 'string')
  assert.ok(result.error.length > 0)
})

test('sign-out sends the provider-required empty JSON body when the browser omits one', () => {
  assert.equal(getRequestBody({ method: 'POST' }, 'sign-out'), '{}')
  assert.equal(getRequestBody({ method: 'POST', body: {} }, 'sign-out'), '{}')
  assert.equal(getRequestBody({ method: 'POST' }, 'sign-in/email'), undefined)
  assert.equal(getRequestBody({ method: 'GET' }, 'sign-out'), undefined)
})

test('auth proxy presents the canonical upstream auth service origin after local origin validation', () => {
  const previousBaseUrl = process.env.NOCODEBACKEND_AUTH_BASE_URL
  const previousInstance = process.env.NOCODEBACKEND_INSTANCE
  process.env.NOCODEBACKEND_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth/'
  process.env.NOCODEBACKEND_INSTANCE = 'test_runtime_instance'

  try {
    assert.equal(upstreamAuthOrigin(), 'https://app.nocodebackend.com')
    const headers = buildUpstreamHeaders({ headers: { cookie: 'session=abc' } }, 'secret')
    assert.equal(headers.origin, 'https://app.nocodebackend.com')
    assert.equal(headers.cookie, 'session=abc')
    assert.equal(headers.authorization, 'Bearer secret')
    assert.equal(headers['x-database-instance'], 'test_runtime_instance')
  } finally {
    if (previousBaseUrl === undefined) delete process.env.NOCODEBACKEND_AUTH_BASE_URL
    else process.env.NOCODEBACKEND_AUTH_BASE_URL = previousBaseUrl

    if (previousInstance === undefined) delete process.env.NOCODEBACKEND_INSTANCE
    else process.env.NOCODEBACKEND_INSTANCE = previousInstance
  }
})

const installAuthTransport = (context, { body, status = 200, action = 'get-session',
  contentType = 'application/json; charset=utf-8' }) => {
  const environment = {
    NOCODEBACKEND_AUTH_SECRET_KEY: 'synthetic-auth-secret',
    NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth',
    NOCODEBACKEND_INSTANCE: 'synthetic-session-instance',
    pourfolio_KV_REST_API_URL: 'https://session-redis.example.invalid',
    pourfolio_KV_REST_API_TOKEN: 'synthetic-redis-token'
  }
  for (const [key, value] of Object.entries(environment)) {
    const previous = process.env[key]
    process.env[key] = value
    context.after(() => {
      if (previous === undefined) delete process.env[key]
      else process.env[key] = previous
    })
  }
  __resetRateLimitsForTests()
  const calls = [], telemetry = []
  context.mock.method(console, 'error', value => telemetry.push(value))
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(String(url))
    if (parsed.origin === environment.pourfolio_KV_REST_API_URL) {
      return new Response(JSON.stringify(parsed.pathname === '/pipeline'
        ? [{ result: [1, 60_000] }] : { result: [1, 60_000] }), {
        headers: { 'content-type': 'application/json' }
      })
    }
    assert.equal(parsed.origin, 'https://app.nocodebackend.com')
    assert.equal(parsed.pathname, '/api/user-auth/' + action)
    assert.equal(parsed.searchParams.get('instance'), environment.NOCODEBACKEND_INSTANCE)
    assert.equal(options.headers.authorization, 'Bearer ' + environment.NOCODEBACKEND_AUTH_SECRET_KEY)
    assert.equal(options.headers.cookie, 'session=synthetic-cookie')
    assert.equal(options.redirect, 'manual')
    calls.push(options)
    return new Response(body, { status, headers: {
      'content-type': contentType,
      'set-cookie': 'session=synthetic-refresh; Domain=app.nocodebackend.com; Path=/api/user-auth; SameSite=None'
    } })
  })
  return { calls, telemetry }
}

const callAuth = async (action = 'get-session', method = 'GET') => {
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(value) { this.statusCode = value; return this },
    json(value) { this.body = value; return this },
    send(value) { this.body = value; return this },
    end() { return this }
  }
  await authHandler({ method, query: { path: action.split('/') },
    headers: { host: 'pourfolio.example', origin: 'https://pourfolio.example',
      cookie: 'session=synthetic-cookie', 'x-request-id': 'synthetic-session-request' },
    socket: { remoteAddress: '192.0.2.123' },
    ...(method === 'POST' ? { body: { email: 'owner@example.invalid', password: 'synthetic-password' } } : {})
  }, response)
  return response
}

for (const [label, payload] of [
  ['null', null], ['null user', { user: null }], ['null session', { session: null }],
  ['null user and session', { user: null, session: null }],
  ['null data', { data: null }], ['wrapped null user', { data: { user: null } }],
  ['wrapped null session', { data: { session: null } }],
  ['wrapped null user and session', { data: { user: null, session: null } }]
]) {
  test(`successful get-session with ${label} is unauthenticated over the actual handler`, async context => {
    const { calls, telemetry } = installAuthTransport(context, { body: JSON.stringify(payload) })
    const response = await callAuth()
    assert.equal(calls.length, 1)
    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.body, {
      error: 'Authentication is required.', requestId: 'synthetic-session-request'
    })
    assert.equal(response.headers['Cache-Control'], 'no-store')
    assert.match(response.headers['Set-Cookie'][0], /^session=synthetic-refresh;/)
    assert.doesNotMatch(JSON.stringify([response.body, telemetry]), /private-session-canary/)
  })
}

for (const [label, body] of [
  ['invalid JSON', '{"private-session-canary"'], ['empty body', ''],
  ['whitespace body', '  \n'], ['array', '[]'], ['populated array', '[{"id":"private-session-canary"}]'],
  ['number', '42'], ['boolean', 'false'], ['string', '"private-session-canary"'],
  ['empty object', '{}'], ['empty user', '{"user":{}}'],
  ['missing user ID', '{"user":{"name":"private-session-canary"}}'],
  ['email without user ID', '{"user":{"email":"private-session-canary@example.invalid"}}'],
  ['empty user ID', '{"user":{"id":""}}'],
  ['malformed user', '{"user":[]}'], ['empty nested session', '{"data":{"session":{}}}'],
  ['unrelated nested ID', '{"data":{"unrelated":{"id":"private-session-canary"}}}'],
  ['unexpected wrapper', '{"result":null}'], ['repeated data wrapper', '{"data":{"data":null}}'],
  ['null user with unknown metadata', '{"user":null,"private":"private-session-canary"}'],
  ['provider error', '{"error":"private-session-canary"}'],
  ['provider error with a user', '{"error":"private-session-canary","user":{"id":"session-owner"}}'],
  ['nested provider error with a user', '{"data":{"error":"private-session-canary","user":{"id":"session-owner"}}}'],
  ['provider errors with a user', '{"errors":["private-session-canary"],"user":{"id":"session-owner"}}'],
  ['unsuccessful envelope with a user', '{"success":false,"user":{"id":"session-owner"}}'],
  ['error status with a user', '{"status":"error","user":{"id":"session-owner"}}']
]) {
  test(`successful get-session with ${label} fails closed as a provider payload error`, async context => {
    const { calls, telemetry } = installAuthTransport(context, { body })
    const response = await callAuth()
    assert.equal(calls.length, 1)
    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.body, {
      error: 'Authentication service is temporarily unavailable.', requestId: 'synthetic-session-request'
    })
    assert.equal(response.headers['Cache-Control'], 'no-store')
    assert.doesNotMatch(JSON.stringify([response.body, telemetry]), /private-session-canary/)
  })
}

for (const status of [401, 403, 429]) {
  test(`get-session upstream ${status} keeps its safe status instead of parsing the failed provider body`, async context => {
    const { calls } = installAuthTransport(context, {
      status, body: 'private-session-canary-not-json', contentType: 'text/html'
    })
    const response = await callAuth()
    assert.equal(calls.length, 1)
    assert.equal(response.statusCode, status)
    assert.equal(response.headers['Content-Type'], 'application/json')
    assert.equal(response.body.requestId, 'synthetic-session-request')
    assert.doesNotMatch(JSON.stringify(response.body), /private-session-canary/)
  })
}

for (const contentType of ['text/plain', 'text/html']) {
  for (const [label, body, status] of [
    ['missing identity', 'null', 401], ['malformed body', '<private-session-canary>', 502]
  ]) {
    test(`get-session ${label} replaces upstream ${contentType} with a safe JSON response`, async context => {
      installAuthTransport(context, { body, contentType })
      const response = await callAuth()
      assert.equal(response.statusCode, status)
      assert.equal(response.headers['Content-Type'], 'application/json')
      assert.equal(response.headers['Cache-Control'], 'no-store')
      assert.equal(response.headers['X-Request-Id'], 'synthetic-session-request')
      assert.deepEqual(response.headers['Set-Cookie'], [
        'session=synthetic-refresh; Path=/; HttpOnly; Secure; SameSite=None'
      ])
      assert.equal(response.body.requestId, 'synthetic-session-request')
      assert.doesNotMatch(JSON.stringify(response.body), /private-session-canary/)
    })
  }
}

for (const action of ['sign-in/email', 'sign-up/email', 'sign-out']) {
  test(`${action} successful response is unchanged by get-session normalization`, async context => {
    const body = Buffer.from('null\n')
    const { calls } = installAuthTransport(context, { action, body })
    const response = await callAuth(action, 'POST')
    assert.equal(calls.length, 1)
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, body)
    assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8')
  })
}

for (const [label, payload] of [
  ['user ID', { user: { id: 'session-owner', email: 'owner@example.invalid' } }],
  ['data user ID alias', { data: { user: { user_id: 'session-owner' } } }],
  ['session user camel-case ID', { session: { user: { userId: 'session-owner' } } }],
  ['nested session user ID alias', { data: { session: { user: { _id: 'session-owner' } } } }],
  ['data identity', { data: { id: 'session-owner' } }],
  ['root identity', { id: 'session-owner' }],
  ['non-error metadata', { user: { id: 'session-owner' }, error: null, success: true }]
]) {
  test(`get-session ${label} preserves the provider response bytes and cookie policy`, async context => {
    const body = Buffer.from(' \n' + JSON.stringify(payload) + '\t\n')
    const { calls } = installAuthTransport(context, { body })
    const response = await callAuth()
    assert.equal(calls.length, 1)
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, body)
    assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8')
    assert.deepEqual(response.headers['Set-Cookie'], [
      'session=synthetic-refresh; Path=/; HttpOnly; Secure; SameSite=None'
    ])
  })
}

test('valid get-session retains its original content type as well as body bytes', async context => {
  const body = Buffer.from(' {"user":{"id":"session-owner"}}\n')
  installAuthTransport(context, { body, contentType: 'text/plain' })
  const response = await callAuth()
  assert.equal(response.statusCode, 200)
  assert.equal(response.headers['Content-Type'], 'text/plain')
  assert.deepEqual(response.body, body)
})
