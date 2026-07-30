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

