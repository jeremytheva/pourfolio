import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CANONICAL_AUTH_BASE_URL,
  CANONICAL_DATA_BASE_URL,
  resolveAuthBaseUrl,
  resolveDataBaseUrl
} from '../nocodeBackendConfig.js'

test('canonical backend surfaces remain distinct and fixed', () => {
  assert.equal(CANONICAL_AUTH_BASE_URL, 'https://app.nocodebackend.com/api/user-auth')
  assert.equal(CANONICAL_DATA_BASE_URL, 'https://api.nocodebackend.com/')
  assert.notEqual(CANONICAL_AUTH_BASE_URL, CANONICAL_DATA_BASE_URL)
})

test('canonical auth and data URLs resolve with or without a trailing slash', () => {
  assert.equal(resolveAuthBaseUrl(CANONICAL_AUTH_BASE_URL), 'https://app.nocodebackend.com/api/user-auth')
  assert.equal(resolveAuthBaseUrl(`${CANONICAL_AUTH_BASE_URL}/`), 'https://app.nocodebackend.com/api/user-auth')
  assert.equal(resolveDataBaseUrl(CANONICAL_DATA_BASE_URL), 'https://api.nocodebackend.com')
  assert.equal(resolveDataBaseUrl('https://api.nocodebackend.com'), 'https://api.nocodebackend.com')
})

test('auth refuses the data endpoint and data refuses the auth endpoint', () => {
  assert.throws(() => resolveAuthBaseUrl(CANONICAL_DATA_BASE_URL), {
    status: 503,
    code: 'AUTH_CONFIGURATION_INVALID'
  })
  assert.throws(() => resolveDataBaseUrl(CANONICAL_AUTH_BASE_URL), {
    status: 503,
    code: 'DATA_CONFIGURATION_INVALID'
  })
})

test('arbitrary upstream endpoints are rejected instead of silently accepted', () => {
  assert.throws(() => resolveAuthBaseUrl('https://example.test/auth'), { code: 'AUTH_CONFIGURATION_INVALID' })
  assert.throws(() => resolveDataBaseUrl('https://example.test/data'), { code: 'DATA_CONFIGURATION_INVALID' })
})
