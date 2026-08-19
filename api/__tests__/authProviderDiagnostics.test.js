import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../auth-proxy.js'

const {
  buildUpstreamHeaders,
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

test('auth proxy presents the upstream auth service origin after local origin validation', () => {
  const previousBaseUrl = process.env.NOCODEBACKEND_AUTH_BASE_URL
  process.env.NOCODEBACKEND_AUTH_BASE_URL = 'https://auth.example.test/api/user-auth/'

  try {
    assert.equal(upstreamAuthOrigin(), 'https://auth.example.test')
    const headers = buildUpstreamHeaders({ headers: { cookie: 'session=abc' } }, 'secret')
    assert.equal(headers.origin, 'https://auth.example.test')
    assert.equal(headers.cookie, 'session=abc')
    assert.equal(headers.authorization, 'Bearer secret')
  } finally {
    if (previousBaseUrl === undefined) delete process.env.NOCODEBACKEND_AUTH_BASE_URL
    else process.env.NOCODEBACKEND_AUTH_BASE_URL = previousBaseUrl
  }
})
