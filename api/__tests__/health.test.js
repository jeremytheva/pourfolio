import assert from 'node:assert/strict'
import test from 'node:test'

import handler from '../health.js'

const environmentVariables = [
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_DATA_BASE_URL',
  'pourfolio_KV_REST_API_URL',
  'pourfolio_KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RATE_LIMIT_KEY_SECRET'
]

function invokeHealthHandler() {
  const result = { headers: {} }
  const response = {
    setHeader(name, value) {
      result.headers[name] = value
    },
    status(statusCode) {
      result.statusCode = statusCode
      return this
    },
    json(body) {
      result.body = body
      return this
    }
  }

  handler({}, response)
  return result
}

function configureEnvironment(environment = {}) {
  for (const variableName of environmentVariables) {
    if (Object.hasOwn(environment, variableName)) process.env[variableName] = environment[variableName]
    else delete process.env[variableName]
  }
}

test('reports the rate limiter as configured with Vercel KV values and a derived key source', (t) => {
  configureEnvironment({
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    pourfolio_KV_REST_API_URL: 'https://redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'redis-token-value'
  })

  const result = invokeHealthHandler()
  assert.equal(result.body.checks.rateLimiterConfigured, true)

  t.after(() => configureEnvironment())
})

test('reports the rate limiter as configured with legacy Upstash aliases', (t) => {
  configureEnvironment({
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
    UPSTASH_REDIS_REST_TOKEN: 'redis-token-value'
  })

  const result = invokeHealthHandler()
  assert.equal(result.body.checks.rateLimiterConfigured, true)

  t.after(() => configureEnvironment())
})

test('reports the rate limiter as unconfigured when either Redis REST value is missing', (t) => {
  for (const missingVariable of ['pourfolio_KV_REST_API_URL', 'pourfolio_KV_REST_API_TOKEN']) {
    const configuredEnvironment = {
      NOCODEBACKEND_SECRET_KEY: 'server-secret',
      pourfolio_KV_REST_API_URL: 'https://redis.example.test',
      pourfolio_KV_REST_API_TOKEN: 'redis-token-value'
    }
    delete configuredEnvironment[missingVariable]
    configureEnvironment(configuredEnvironment)

    const result = invokeHealthHandler()
    assert.equal(result.body.checks.rateLimiterConfigured, false, `${missingVariable} should be required`)
  }

  t.after(() => configureEnvironment())
})

test('health identifies direct V2 data transport and rejects legacy Lambda configuration', (t) => {
  configureEnvironment({
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    NOCODEBACKEND_DATA_BASE_URL: 'https://provider.example.test/data',
    pourfolio_KV_REST_API_URL: 'https://redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'redis-token-value'
  })
  let result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, true)
  assert.equal(result.body.checks.dataTransport, 'direct-v2')

  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, false)
  assert.equal(result.body.checks.dataTransport, 'legacy-proxy')

  t.after(() => configureEnvironment())
})

test('health response never exposes configured credential values', (t) => {
  const configuredEnvironment = {
    NOCODEBACKEND_SECRET_KEY: 'private-server-secret',
    NOCODEBACKEND_DATA_BASE_URL: 'https://provider.example.test/data',
    pourfolio_KV_REST_API_URL: 'https://private-redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'private-redis-token-value',
    RATE_LIMIT_KEY_SECRET: 'private-rate-limit-secret-value'
  }
  configureEnvironment(configuredEnvironment)

  const result = invokeHealthHandler()
  const serialisedResponse = JSON.stringify(result.body)

  assert.equal(result.statusCode, 200)
  assert.equal(result.body.checks.rateLimiterConfigured, true)
  for (const credentialValue of Object.values(configuredEnvironment)) {
    assert.equal(serialisedResponse.includes(credentialValue), false)
  }

  t.after(() => configureEnvironment())
})
