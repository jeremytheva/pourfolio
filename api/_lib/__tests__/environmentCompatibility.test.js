import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveRedisRestConfig } from '../redis.js'
import { resolveRateLimitKeySecret } from '../rateLimit.js'

test('Vercel screenshot variable names provide the Redis REST configuration', () => {
  const environment = {
    pourfolio_KV_REST_API_URL: 'https://kv.example.test',
    pourfolio_KV_REST_API_TOKEN: 'write-token',
    pourfolio_KV_REST_API_READ_ONLY_TOKEN: 'read-only-token',
    pourfolio_KV_URL: 'redis://kv.example.test',
    pourfolio_REDIS_URL: 'redis://redis.example.test'
  }

  assert.deepEqual(resolveRedisRestConfig(environment), {
    url: 'https://kv.example.test',
    token: 'write-token'
  })
})

test('the read-only KV token is never selected for rate-limit writes', () => {
  assert.deepEqual(resolveRedisRestConfig({
    pourfolio_KV_REST_API_URL: 'https://kv.example.test',
    pourfolio_KV_REST_API_READ_ONLY_TOKEN: 'read-only-token'
  }), {
    url: 'https://kv.example.test',
    token: ''
  })
})

test('rate-limit key material can be derived from the configured NoCodeBackend secret', () => {
  const environment = { NOCODEBACKEND_SECRET_KEY: 'nocode-test-secret' }
  const first = resolveRateLimitKeySecret(environment)
  const second = resolveRateLimitKeySecret(environment)

  assert.equal(typeof first, 'string')
  assert.ok(first.length > 20)
  assert.equal(first, second)
  assert.notEqual(first, environment.NOCODEBACKEND_SECRET_KEY)
  assert.equal(first.includes(environment.NOCODEBACKEND_SECRET_KEY), false)
})

test('an explicit rate-limit key override remains supported', () => {
  assert.equal(resolveRateLimitKeySecret({
    RATE_LIMIT_KEY_SECRET: 'dedicated-secret',
    NOCODEBACKEND_SECRET_KEY: 'nocode-test-secret'
  }), 'dedicated-secret')
})

test('rate limiting still fails closed when neither secret source exists', () => {
  assert.equal(resolveRateLimitKeySecret({}), '')
})
