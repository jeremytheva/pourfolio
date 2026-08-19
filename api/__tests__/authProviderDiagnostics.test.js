import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../auth-proxy.js'

const {
  providerCredentialFailure,
  safeUpstreamAuthError
} = __testables

test('provider credential failures are classified for auth bootstrap and sign-in/up actions', () => {
  for (const path of [
    'providers',
    'sign-up/email',
    'sign-in/email',
    'sign-in/otp',
    'verify-otp',
    'sign-in/google'
  ]) {
    assert.equal(providerCredentialFailure(path, 401), true, `${path} 401`)
    assert.equal(providerCredentialFailure(path, 403), true, `${path} 403`)
  }
})

test('ordinary unauthenticated session and sign-out responses are not misclassified as provider configuration failures', () => {
  for (const path of ['get-session', 'sign-out']) {
    assert.equal(providerCredentialFailure(path, 401), false, `${path} 401`)
    assert.equal(providerCredentialFailure(path, 403), false, `${path} 403`)
  }
})

test('provider credential failures expose only the safe diagnostic code and request id', () => {
  assert.deepEqual(
    safeUpstreamAuthError('sign-up/email', 403, 'request-123'),
    {
      error: 'Authentication service configuration is invalid.',
      code: 'auth_provider_unauthorised',
      requestId: 'request-123'
    }
  )
})

test('non-credential upstream failures retain generic safe errors without the configuration code', () => {
  const result = safeUpstreamAuthError('sign-up/email', 422, 'request-456')
  assert.equal(result.code, undefined)
  assert.equal(result.requestId, 'request-456')
  assert.equal(typeof result.error, 'string')
  assert.ok(result.error.length > 0)
})
