import assert from 'node:assert/strict'
import test from 'node:test'
import { getRedisClient } from '../redis.js'

test('an injected Redis-compatible client does not require production configuration', () => {
  const redis = { eval: async () => [1, 60_000] }
  assert.equal(getRedisClient(redis), redis)
})

test('an injected client must provide eval', () => {
  assert.throws(() => getRedisClient({}), /Injected Redis client is invalid/)
})

test('the production client requires both Upstash environment variables', () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN

  try {
    assert.throws(() => getRedisClient(), /Redis is not configured/)
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken
  }
})
