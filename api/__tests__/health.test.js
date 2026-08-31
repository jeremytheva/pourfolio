import assert from 'node:assert/strict'
import test from 'node:test'

import handler from '../health.js'

const TEST_INSTANCE = 'test-instance'
const environmentVariables = [
  'NOCODEBACKEND_AUTH_BASE_URL',
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE',
  'pourfolio_KV_REST_API_URL',
  'pourfolio_KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RATE_LIMIT_KEY_SECRET',
  'VERCEL_GIT_COMMIT_SHA',
  'VERCEL_ENV'
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

test('reports NoCodeBackend configured from the four runtime variables', () => {
  configureEnvironment({
    NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth',
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    NOCODEBACKEND_INSTANCE: TEST_INSTANCE
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
  assert.equal(JSON.stringify(checks).includes(TEST_INSTANCE), false)
})

test('hardcoded data endpoint remains canonical while instance is runtime-only', async () => {
  const { __testables } = await import('../health.js')
  assert.equal(__testables.CANONICAL_DATA_BASE_URL, 'https://api.nocodebackend.com/')
  assert.equal(Object.hasOwn(__testables, 'CANONICAL_INSTANCE'), false)
})

test('invalid data endpoint reports data as unconfigured', () => {
  configureEnvironment({
    NOCODEBACKEND_DATA_BASE_URL: 'not-a-url',
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    NOCODEBACKEND_INSTANCE: TEST_INSTANCE
  })
  const checks = invokeHealthHandler().body.checks
  assert.equal(checks.dataConfigured, false)
  assert.equal(checks.dataTransport, 'invalid')
  assert.equal(checks.dataEndpointCanonical, false)
  assert.equal(checks.instanceConfigured, true)
})

test('missing instance cannot report authentication or data configuration as ready', () => {
  configureEnvironment({
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'server-secret'
  })
  const checks = invokeHealthHandler().body.checks
  assert.equal(checks.instanceConfigured, false)
  assert.equal(checks.authenticationConfigured, false)
  assert.equal(checks.dataConfigured, false)
})

test('reports the rate limiter as configured with Vercel KV values', () => {
  configureEnvironment({
    NOCODEBACKEND_SECRET_KEY: 'server-secret',
    NOCODEBACKEND_INSTANCE: TEST_INSTANCE,
    pourfolio_KV_REST_API_URL: 'https://redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'redis-token-value'
  })
  assert.equal(invokeHealthHandler().body.checks.rateLimiterConfigured, true)
})

test('health reports only canonical release provenance values', () => {
  configureEnvironment({
    VERCEL_GIT_COMMIT_SHA: 'ABCDEF0123456789ABCDEF0123456789ABCDEF01',
    VERCEL_ENV: 'PRODUCTION'
  })
  assert.deepEqual(invokeHealthHandler().body.release, {
    commitSha: 'abcdef0123456789abcdef0123456789abcdef01',
    environment: 'production'
  })
})

test('health fails closed on malformed release provenance without echoing it', () => {
  configureEnvironment({
    VERCEL_GIT_COMMIT_SHA: 'private-or-malformed-sha-value',
    VERCEL_ENV: 'private-environment-value'
  })
  const release = invokeHealthHandler().body.release
  assert.deepEqual(release, { commitSha: null, environment: null })
  assert.equal(JSON.stringify(release).includes('private'), false)
})

test('health response never exposes configured credential or instance values', () => {
  const configuredEnvironment = {
    NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth',
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'private-server-secret',
    NOCODEBACKEND_INSTANCE: TEST_INSTANCE,
    pourfolio_KV_REST_API_URL: 'https://private-redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'private-redis-token-value',
    RATE_LIMIT_KEY_SECRET: 'private-rate-limit-secret-value'
  }
  configureEnvironment(configuredEnvironment)
  const result = invokeHealthHandler()
  const serialisedResponse = JSON.stringify(result.body)
  assert.equal(result.statusCode, 200)
  for (const sensitiveValue of [
    configuredEnvironment.NOCODEBACKEND_SECRET_KEY,
    configuredEnvironment.NOCODEBACKEND_INSTANCE,
    configuredEnvironment.pourfolio_KV_REST_API_TOKEN,
    configuredEnvironment.RATE_LIMIT_KEY_SECRET
  ]) assert.equal(serialisedResponse.includes(sensitiveValue), false)
})
