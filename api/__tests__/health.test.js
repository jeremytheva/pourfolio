import assert from 'node:assert/strict'
import test from 'node:test'

import handler from '../health.js'

const rateLimiterEnvironmentVariables = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RATE_LIMIT_KEY_SECRET'
]

function invokeHealthHandler() {
  const result = {
    headers: {}
  }
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

function configureRateLimiter(environment = {}) {
  for (const variableName of rateLimiterEnvironmentVariables) {
    if (Object.hasOwn(environment, variableName)) {
      process.env[variableName] = environment[variableName]
    } else {
      delete process.env[variableName]
    }
  }
}

test('reports the rate limiter as unconfigured when any required variable is missing', (t) => {
  const configuredEnvironment = {
    UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
    UPSTASH_REDIS_REST_TOKEN: 'redis-token-value',
    RATE_LIMIT_KEY_SECRET: 'rate-limit-secret-value'
  }

  for (const missingVariable of rateLimiterEnvironmentVariables) {
    configureRateLimiter(configuredEnvironment)
    delete process.env[missingVariable]

    const result = invokeHealthHandler()

    assert.equal(
      result.body.checks.rateLimiterConfigured,
      false,
      `${missingVariable} should be required`
    )
  }

  t.after(() => configureRateLimiter())
})

test('reports the rate limiter as configured without exposing credential metadata', (t) => {
  const configuredEnvironment = {
    UPSTASH_REDIS_REST_URL: 'https://private-redis.example.test',
    UPSTASH_REDIS_REST_TOKEN: 'private-redis-token-value',
    RATE_LIMIT_KEY_SECRET: 'private-rate-limit-secret-value'
  }
  configureRateLimiter(configuredEnvironment)

  const result = invokeHealthHandler()
  const serialisedResponse = JSON.stringify(result.body)

  assert.equal(result.statusCode, 200)
  assert.equal(result.body.checks.rateLimiterConfigured, true)
  for (const credentialValue of Object.values(configuredEnvironment)) {
    assert.equal(serialisedResponse.includes(credentialValue), false)
  }

  t.after(() => configureRateLimiter())
})
