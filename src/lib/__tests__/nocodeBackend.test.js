import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeProviders } from '../nocodeBackend.js'

const safeProviders = { emailPassword: true, emailOtp: false, google: false }
const mockWindowTimers = (context) => {
  const previousWindow = globalThis.window
  globalThis.window = { setTimeout, clearTimeout }
  context.after(() => { globalThis.window = previousWindow })
}

test('normalises aliases in each authoritative provider response shape', () => {
  const entries = [
    { name: 'email-password', enabled: false },
    { provider: 'magic_link', isEnabled: true },
    { id: 'googleOAuth', active: true }
  ]

  for (const payload of [
    entries,
    { providers: entries },
    { authProviders: entries },
    { enabledProviders: entries },
    { data: { providers: entries } }
  ]) {
    assert.deepEqual(normalizeProviders(payload), {
      emailPassword: false,
      emailOtp: true,
      google: true
    })
  }
})

test('accepts the live NoCodeBackend provider envelope while ignoring unrelated metadata', () => {
  assert.deepEqual(normalizeProviders({
    providers: { email: true, google: false },
    baseUrl: 'https://provider.example.test/api/user-auth',
    requiredHeaders: {
      'X-Database-Instance': 'example-instance'
    }
  }), safeProviders)
})

test('accepts alias-keyed maps and enables optional providers only when true', () => {
  assert.deepEqual(normalizeProviders({
    providers: {
      credentials: { active: true },
      emailCode: false,
      oauth_google: { isEnabled: false }
    }
  }), safeProviders)
})

test('defaults password to enabled when it is not explicitly disabled', () => {
  assert.deepEqual(normalizeProviders({ providers: ['otp'] }), {
    emailPassword: true,
    emailOtp: true,
    google: false
  })
})

test('honours explicit disabled flags without enabling optional providers by presence', () => {
  assert.deepEqual(normalizeProviders({
    enabledProviders: [
      { type: 'credentials', isEnabled: false },
      { key: 'magicLink', enabled: false },
      { provider: 'googleOAuth', active: true }
    ]
  }), {
    emailPassword: false,
    emailOtp: false,
    google: true
  })
})

test('rejects absent, empty, malformed, unrecognised, and ambiguous payloads', () => {
  for (const payload of [
    null,
    {},
    { providers: [] },
    { providers: ['github'] },
    { providers: [{ name: 'google', enabled: 'yes' }] },
    { providers: ['google'], data: { providers: ['otp'] } },
    { providers: [{ name: 'email', enabled: true }, { name: 'password', active: false }] }
  ]) {
    assert.equal(normalizeProviders(payload), null)
  }
})

test('ApiError preserves safe upstream error codes', async () => {
  const { authRequest } = await import('../nocodeBackend.js')
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: 'Authentication is not configured.',
    code: 'auth_configuration_missing',
    requestId: 'request-123'
  }), { status: 503 })

  try {
    await assert.rejects(
      authRequest('/providers', { method: 'GET' }),
      (error) => {
        assert.equal(error.status, 503)
        assert.equal(error.code, 'auth_configuration_missing')
        assert.equal(error.requestId, 'request-123')
        return true
      }
    )
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('apiRequest converts an aborted request into the safe timeout error', async () => {
  const { apiRequest } = await import('../nocodeBackend.js')
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch

  globalThis.window = {
    setTimeout(callback) {
      callback()
      return 1
    },
    clearTimeout() {}
  }
  globalThis.fetch = async (_url, options = {}) => {
    if (options.signal?.aborted) {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    }
    return new Response('{}', { status: 200 })
  }

  try {
    await assert.rejects(
      apiRequest('/catalog/products?page=1&limit=24'),
      (error) => {
        assert.equal(error.name, 'ApiError')
        assert.equal(error.message, 'The request timed out. Please try again.')
        assert.equal(error.status, 0)
        return true
      }
    )
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('apiRequest converts transport failure into the safe connection error', async () => {
  const { apiRequest } = await import('../nocodeBackend.js')
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async () => {
    throw new TypeError('private transport detail')
  }

  try {
    await assert.rejects(
      apiRequest('/catalog/products?page=1&limit=24'),
      (error) => {
        assert.equal(error.name, 'ApiError')
        assert.equal(error.message, 'The service could not be reached. Please check your connection and try again.')
        assert.equal(error.message.includes('private transport detail'), false)
        return true
      }
    )
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('unconfirmed cellar mutations require a reload after transport failure and are never retried', async (context) => {
  const { apiRequest } = await import('../nocodeBackend.js')
  mockWindowTimers(context)
  let calls = 0
  let failure
  context.mock.method(globalThis, 'fetch', async () => {
    calls += 1
    throw failure
  })

  for (const [path, method] of [['/cellar', 'POST'], ['/cellar/54', 'PUT'], ['/cellar/54?check=1', 'DELETE']]) {
    for (failure of [new DOMException('aborted', 'AbortError'), new TypeError('private transport detail')]) {
      const before = calls
      await assert.rejects(apiRequest(path, { method, body: { quantity: 1 } }), (error) => {
        assert.equal(error.name, 'ApiError')
        assert.equal(error.code, 'CELLAR_WRITE_UNVERIFIED')
        assert.match(error.message, /Reload your cellar and check it before making another change/)
        assert.equal(error.message.includes('try again'), false)
        assert.equal(error.message.includes('private transport detail'), false)
        return true
      })
      assert.equal(calls - before, 1)
    }
  }
})

test('cellar uncertainty guidance leaves read, unrelated route and authentication errors unchanged', async (context) => {
  const { apiRequest, authRequest } = await import('../nocodeBackend.js')
  mockWindowTimers(context)
  context.mock.method(globalThis, 'fetch', async () => { throw new DOMException('aborted', 'AbortError') })

  for (const [operation, path, method] of [
    [apiRequest, '/cellar', 'GET'],
    [apiRequest, '/cellar/54', 'GET'],
    [apiRequest, '/cellar/54/actions', 'POST'],
    [apiRequest, '/cellar-export', 'POST'],
    [apiRequest, '/ratings/submit', 'POST'],
    [authRequest, '/cellar', 'POST']
  ]) {
    await assert.rejects(operation(path, { method }), (error) => {
      assert.equal(error.code, null)
      assert.equal(error.message, 'The request timed out. Please try again.')
      return true
    })
  }
})

test('cellar persistence errors preserve evidence and direct the user to check before another write', async (context) => {
  const { apiRequest } = await import('../nocodeBackend.js')
  mockWindowTimers(context)
  let code
  let calls = 0
  context.mock.method(globalThis, 'fetch', async () => {
    calls += 1
    return new Response(JSON.stringify({ error: 'Please try again.', code, requestId: 'cellar-request-123' }), { status: 502 })
  })

  for (code of ['CELLAR_WRITE_UNVERIFIED', 'CELLAR_PERSISTENCE_MISMATCH', 'CELLAR_DELETE_NOT_VERIFIED']) {
    const before = calls
    await assert.rejects(apiRequest('/cellar/54', { method: 'PUT', body: { quantity: 2 } }), (error) => {
      assert.equal(error.code, code)
      assert.equal(error.status, 502)
      assert.equal(error.requestId, 'cellar-request-123')
      assert.match(error.message, /Reload your cellar and check it before making another change/)
      return true
    })
    assert.equal(calls - before, 1)
  }
})
