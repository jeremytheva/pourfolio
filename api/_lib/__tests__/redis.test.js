import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRedisClientAccessor,
  getRedisClient,
  REDIS_ERROR_CODES,
  RedisError
} from '../redis.js'

test('an injected Redis-compatible client does not require production configuration', () => {
  const redis = { eval: async () => [1, 60_000] }
  assert.equal(getRedisClient(redis), redis)
})

test('an injected client must provide eval', () => {
  assert.throws(() => getRedisClient({}), (error) => {
    assert.ok(error instanceof RedisError)
    assert.equal(error.code, REDIS_ERROR_CODES.CLIENT_INVALID)
    assert.equal(error.message, 'Redis operation failed')
    return true
  })
})

test('the production client requires both Upstash environment variables', () => {
  const missingVariables = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]

  for (const missingVariable of missingVariables) {
    const environment = {
      UPSTASH_REDIS_REST_URL: 'https://example.test',
      UPSTASH_REDIS_REST_TOKEN: 'test-token'
    }
    delete environment[missingVariable]
    const accessor = createRedisClientAccessor({ environment })

    assert.throws(() => accessor(), (error) => {
      assert.ok(error instanceof RedisError)
      assert.equal(error.code, REDIS_ERROR_CODES.CONFIGURATION_MISSING)
      assert.equal(error.message, 'Redis operation failed')
      return true
    })
  }
})

test('the production accessor creates one Upstash client from standard variables', () => {
  const environment = {
    UPSTASH_REDIS_REST_URL: 'https://example.test',
    UPSTASH_REDIS_REST_TOKEN: 'test-token'
  }
  const redis = { eval: async () => [1, 60_000] }
  let fromEnvCalls = 0
  const Redis = {
    fromEnv() {
      fromEnvCalls += 1
      return redis
    }
  }
  const accessor = createRedisClientAccessor({
    environment,
    createClient: () => Redis.fromEnv()
  })

  assert.equal(accessor(), redis)
  assert.equal(accessor(), redis)
  assert.equal(fromEnvCalls, 1)
})
