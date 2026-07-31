import assert from 'node:assert/strict'
import test from 'node:test'
import { getRedisClient, REDIS_ERROR_CODES, RedisError } from '../redis.js'

test('an injected Redis-compatible client does not require production configuration', () => {
  const redis = { eval: async () => [1, 60_000] }
  assert.equal(getRedisClient(redis), redis)
})

test('an injected client must provide eval', () => {
  const error = assert.throws(() => getRedisClient({}))

  assert.ok(error instanceof RedisError)
  assert.equal(error.code, REDIS_ERROR_CODES.CLIENT_INVALID)
  assert.equal(error.message, 'Redis operation failed')
})

test('the production client requires both Upstash environment variables', () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const missingVariables = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]

  try {
    for (const missingVariable of missingVariables) {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.test'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      delete process.env[missingVariable]

      const error = assert.throws(() => getRedisClient())

      assert.ok(error instanceof RedisError)
      assert.equal(error.code, REDIS_ERROR_CODES.CONFIGURATION_MISSING)
      assert.equal(error.message, 'Redis operation failed')
    }
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken
  }
})
