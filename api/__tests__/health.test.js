import assert from 'node:assert/strict'
import test from 'node:test'

import handler from '../health.js'

const environmentVariables = [
  'NOCODEBACKEND_AUTH_BASE_URL',
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE',
  'pourfolio_KV_REST_API_URL',
  'pourfolio_KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RATE_LIMIT_KEY_SECRET'
]

function invokeHealthHandler() {
  const result = { headers: {} }
  const response = {
    setHeader(name, value) { result.headers[name] = value },
    status(statusCode) { result.statusCode = statusCode; return this },
    json(body) { result.body = body; return this }
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

test.afterEach(() => configureEnvironment())

test('reports NoCodeBackend configured from the four Vercel variables', () => {
  configureEnvironment({
    NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth',
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    NOCODEBACKEND_INSTANCE: '54026_rating'
  })
  const checks = invokeHealthHandler().body.checks
  assert.equal(checks.authenticationConfigured, true)
  assert.equal(checks.dataConfigured, true)
  assert.equal(checks.dataTransport, 'nocodebackend-api')
  assert.equal(checks.dataEndpointConfigured, true)
  assert.equal(checks.dataEndpointCanonical, true)
  assert.equal(checks.instanceConfigured, true)
  assert.equal(checks.authCredentialSource, 'nocodebackend-secret-key')
  assert.equal(checks.dataCredentialSource, 'nocodebackend-secret-key')
})

test('hardcoded data endpoint is the Vercel endpoint', async () => {
  const { __testables } = await import('../health.js')
  assert.equal(__testables.CANONICAL_DATA_BASE_URL, 'https://api.nocodebackend.com/')
})

test('invalid data endpoint reports data as unconfigured', () => {
  configureEnvironment({
    NOCODEBACKEND_DATA_BASE_URL: 'not-a-url',
    NOCODEBACKEND_SECRET_KEY: 'server-secret'
  })
  const checks = invokeHealthHandler().body.checks
  assert.equal(checks.dataConfigured, false)
  assert.equal(checks.dataTransport, 'invalid')
  assert.equal(checks.dataEndpointCanonical, false)
})

test('reports the rate limiter as configured with Vercel KV values', () => {
  configureEnvironment({
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    pourfolio_KV_REST_API_URL: 'https://redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'redis-token-value'
  })
  assert.equal(invokeHealthHandler().body.checks.rateLimiterConfigured, true)
})

test('health response never exposes configured credential values', () => {
  const configuredEnvironment = {
    NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth',
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'private-server-secret',
    NOCODEBACKEND_INSTANCE: '54026_rating',
    pourfolio_KV_REST_API_URL: 'https://private-redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'private-redis-token-value',
    RATE_LIMIT_KEY_SECRET: 'private-rate-limit-secret-value'
  }
  configureEnvironment(configuredEnvironment)
  const result = invokeHealthHandler()
  const serialisedResponse = JSON.stringify(result.body)
  assert.equal(result.statusCode, 200)
  for (const credentialValue of [
    configuredEnvironment.NOCODEBACKEND_SECRET_KEY,
    configuredEnvironment.pourfolio_KV_REST_API_TOKEN,
    configuredEnvironment.RATE_LIMIT_KEY_SECRET
  ]) assert.equal(serialisedResponse.includes(credentialValue), false)
})
