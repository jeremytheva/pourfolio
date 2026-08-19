import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRedisClientAccessor,
  getRedisClient,
  REDIS_ERROR_CODES,
  RedisError,
  resolveRedisRestConfig
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

test('Vercel integration variable names are the preferred Redis REST configuration', () => {
  assert.deepEqual(resolveRedisRestConfig({
    pourfolio_KV_REST_API_URL: 'https://vercel-kv.example.test',
    pourfolio_KV_REST_API_TOKEN: 'vercel-token',
    UPSTASH_REDIS_REST_URL: 'https://legacy.example.test',
    UPSTASH_REDIS_REST_TOKEN: 'legacy-token'
  }), {
    url: 'https://vercel-kv.example.test',
    token: 'vercel-token'
  })
})

test('legacy Upstash variable names remain a compatibility fallback', () => {
  assert.deepEqual(resolveRedisRestConfig({
    UPSTASH_REDIS_REST_URL: 'https://legacy.example.test',
    UPSTASH_REDIS_REST_TOKEN: 'legacy-token'
  }), {
    url: 'https://legacy.example.test',
    token: 'legacy-token'
  })
})

test('the production client requires both Redis REST values', () => {
  const missingVariables = [
    'pourfolio_KV_REST_API_URL',
    'pourfolio_KV_REST_API_TOKEN'
  ]

  for (const missingVariable of missingVariables) {
    const environment = {
      pourfolio_KV_REST_API_URL: 'https://example.test',
      pourfolio_KV_REST_API_TOKEN: 'test-token'
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

test('the production accessor creates one Redis client from Vercel KV values', () => {
  const environment = {
    pourfolio_KV_REST_API_URL: 'https://example.test',
    pourfolio_KV_REST_API_TOKEN: 'test-token'
  }
  const redis = { eval: async () => [1, 60_000] }
  const receivedConfigs = []
  const accessor = createRedisClientAccessor({
    environment,
    createClient: (config) => {
      receivedConfigs.push(config)
      return redis
    }
  })

  assert.equal(accessor(), redis)
  assert.equal(accessor(), redis)
  assert.deepEqual(receivedConfigs, [{ url: 'https://example.test', token: 'test-token' }])
})
