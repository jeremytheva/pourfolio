import assert from 'node:assert/strict'
import test from 'node:test'

import handler from '../health.js'

const environmentVariables = [
  'NCB_SECRET_KEY',
  'NCB_API_KEY',
  'NOCODEBACKEND_API_KEY',
  'NCB_DATA_API_URL',
  'NCB_ALLOW_CUSTOM_DATA_API',
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

test('reports the rate limiter as configured with Vercel KV values and a derived key source', (t) => {
  configureEnvironment({ NOCODEBACKEND_SECRET_KEY: 'server-secret', pourfolio_KV_REST_API_URL: 'https://redis.example.test', pourfolio_KV_REST_API_TOKEN: 'redis-token-value' })
  assert.equal(invokeHealthHandler().body.checks.rateLimiterConfigured, true)
  t.after(() => configureEnvironment())
})

test('reports the rate limiter as configured with legacy Upstash aliases', (t) => {
  configureEnvironment({ NOCODEBACKEND_SECRET_KEY: 'server-secret', UPSTASH_REDIS_REST_API_URL: 'https://redis.example.test', UPSTASH_REDIS_REST_TOKEN: 'redis-token-value' })
  // Correct alias name is exercised by the next assignment; this protects against leaked env state.
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test'
  assert.equal(invokeHealthHandler().body.checks.rateLimiterConfigured, true)
  t.after(() => configureEnvironment())
})

test('reports the rate limiter as unconfigured when either Redis REST value is missing', (t) => {
  for (const missingVariable of ['pourfolio_KV_REST_API_URL', 'pourfolio_KV_REST_API_TOKEN']) {
    const configuredEnvironment = { NOCODEBACKEND_SECRET_KEY: 'server-secret', pourfolio_KV_REST_API_URL: 'https://redis.example.test', pourfolio_KV_REST_API_TOKEN: 'redis-token-value' }
    delete configuredEnvironment[missingVariable]
    configureEnvironment(configuredEnvironment)
    assert.equal(invokeHealthHandler().body.checks.rateLimiterConfigured, false, `${missingVariable} should be required`)
  }
  t.after(() => configureEnvironment())
})

test('health enforces the supplied generated table API and ignores stale overrides', (t) => {
  configureEnvironment({ NCB_SECRET_KEY: 'server-secret', NCB_DATA_API_URL: 'https://app.nocodebackend.com/api/data' })
  let result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, true)
  assert.equal(result.body.checks.dataTransport, 'generated-table-api')
  assert.equal(result.body.checks.dataOverride, 'none')
  assert.equal(result.body.checks.dataCredentialSource, 'ncb-secret-key')

  delete process.env.NCB_DATA_API_URL
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  result = invokeHealthHandler()
  assert.equal(result.body.checks.dataTransport, 'generated-table-api')
  assert.equal(result.body.checks.dataOverride, 'ignored')

  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://wrong.example.test/data'
  result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, true)
  assert.equal(result.body.checks.dataTransport, 'generated-table-api')
  assert.equal(result.body.checks.dataOverride, 'ignored')
  t.after(() => configureEnvironment())
})

test('custom table API requires explicit opt-in and malformed opted-in configuration fails closed', (t) => {
  configureEnvironment({ NCB_API_KEY: 'data-key', NOCODEBACKEND_DATA_BASE_URL: 'https://provider.example.test/data', NCB_ALLOW_CUSTOM_DATA_API: '1' })
  let result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, true)
  assert.equal(result.body.checks.dataCredentialSource, 'ncb-api-key')
  assert.equal(result.body.checks.dataTransport, 'custom-table-api')
  assert.equal(result.body.checks.dataOverride, 'accepted')

  process.env.NOCODEBACKEND_DATA_BASE_URL = 'not-a-url'
  result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, false)
  assert.equal(result.body.checks.dataTransport, 'invalid')
  assert.equal(result.body.checks.dataOverride, 'invalid')
  t.after(() => configureEnvironment())
})

test('legacy auth secret alone does not claim generated-table readiness', (t) => {
  configureEnvironment({ NOCODEBACKEND_SECRET_KEY: 'auth-secret' })
  const result = invokeHealthHandler()
  assert.equal(result.body.checks.authenticationConfigured, true)
  assert.equal(result.body.checks.authCredentialSource, 'nocodebackend-secret-key')
  assert.equal(result.body.checks.dataConfigured, false)
  assert.equal(result.body.checks.dataCredentialSource, 'missing')
  assert.equal(result.body.checks.secretAliasState, 'legacy-only')
  t.after(() => configureEnvironment())
})

test('health reports supported generated-table API key aliases', (t) => {
  configureEnvironment({ NCB_API_KEY: 'data-key' })
  let result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, true)
  assert.equal(result.body.checks.dataCredentialSource, 'ncb-api-key')

  configureEnvironment({ NOCODEBACKEND_API_KEY: 'legacy-data-key' })
  result = invokeHealthHandler()
  assert.equal(result.body.checks.dataConfigured, true)
  assert.equal(result.body.checks.dataCredentialSource, 'nocodebackend-api-key')
  t.after(() => configureEnvironment())
})

test('health response never exposes configured credential values', (t) => {
  const configuredEnvironment = {
    NCB_SECRET_KEY: 'private-server-secret',
    NCB_DATA_API_URL: 'https://app.nocodebackend.com/api/data',
    pourfolio_KV_REST_API_URL: 'https://private-redis.example.test',
    pourfolio_KV_REST_API_TOKEN: 'private-redis-token-value',
    RATE_LIMIT_KEY_SECRET: 'private-rate-limit-secret-value'
  }
  configureEnvironment(configuredEnvironment)
  const result = invokeHealthHandler()
  const serialisedResponse = JSON.stringify(result.body)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.checks.rateLimiterConfigured, true)
  for (const credentialValue of Object.values(configuredEnvironment)) assert.equal(serialisedResponse.includes(credentialValue), false)
  t.after(() => configureEnvironment())
})
