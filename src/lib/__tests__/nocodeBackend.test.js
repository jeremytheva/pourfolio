import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeProviders } from '../nocodeBackend.js'

const safeProviders = { emailPassword: true, emailOtp: false, google: false }

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