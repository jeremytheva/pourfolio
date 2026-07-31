import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSharedRateLimitKey,
  checkSharedRateLimit,
  enforceSharedRateLimit,
  normaliseAccountIdentifier
} from '../rateLimit.js'
import { createInMemoryRedis } from './inMemoryRedis.js'

const request = (email = ' Person@Example.COM ') => ({
  headers: { 'x-vercel-forwarded-for': '203.0.113.8' },
  body: { email }
})

test('account identifiers are normalised and equivalent identifiers share an opaque key', () => {
  assert.equal(normaliseAccountIdentifier('  PERSON@example.com '), 'person@example.com')
  assert.equal(
    buildSharedRateLimitKey(request(), 'sign-in/email', 'secret'),
    buildSharedRateLimitKey(request('person@example.com'), 'sign-in/email', 'secret')
  )
  assert.equal(buildSharedRateLimitKey(request(), 'sign-in/email', 'secret').includes('person'), false)
})

test('shared limit allows the boundary and rejects the next operation', async () => {
  const call = (count) => checkSharedRateLimit(request(), 'verify-otp', {
    keySecret: 'secret',
    redis: { eval: async () => [count, 60_000] }
  })
  assert.equal((await call(8)).allowed, true)
  assert.equal((await call(9)).allowed, false)
})

test('rejected requests retain the generic response and correlation ID', async () => {
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body }
  }
  assert.equal(await enforceSharedRateLimit(request(), response, 'verify-otp', {
    keySecret: 'secret',
    requestId: 'request-123',
    redis: { eval: async () => [9, 60_000] }
  }), false)
  assert.equal(response.statusCode, 429)
  assert.deepEqual(response.body, {
    error: 'Too many requests. Please try again shortly.',
    requestId: 'request-123'
  })
})

test('atomic shared operation attaches the configured expiration to a new bucket', async () => {
  let command
  await checkSharedRateLimit(request(), 'sign-up/email', {
    keySecret: 'secret',
    redis: { eval: async (...args) => {
      command = args
      return [1, 3_600_000]
    } }
  })
  assert.match(command[0], /PEXPIRE/)
  assert.equal(command[1].length, 1)
  assert.match(command[1][0], /^pourfolio:auth:signup:/)
  assert.deepEqual(command[2], ['3600000'])
})

test('shared counters increment without resetting the original expiry', async () => {
  const redis = createInMemoryRedis()
  const options = { keySecret: 'secret', redis }

  const first = await checkSharedRateLimit(request(), 'sign-in/email', options)
  assert.equal(first.count, 1)
  assert.equal(first.ttlMs, 15 * 60_000)

  redis.advanceTime(1_000)
  const second = await checkSharedRateLimit(request(), 'sign-in/email', options)
  assert.equal(second.count, 2)
  assert.equal(second.ttlMs, first.ttlMs - 1_000)
})

test('different opaque keys maintain independent counters', async () => {
  const redis = createInMemoryRedis()
  const options = { keySecret: 'secret', redis }

  assert.equal((await checkSharedRateLimit(request('first@example.com'), 'sign-in/email', options)).count, 1)
  assert.equal((await checkSharedRateLimit(request('first@example.com'), 'sign-in/email', options)).count, 2)
  assert.equal((await checkSharedRateLimit(request('second@example.com'), 'sign-in/email', options)).count, 1)
})

const captureFailure = async (options) => {
  const previousError = console.error
  const logs = []
  console.error = (...values) => logs.push(values)
  const response = {
    setHeader() {}, status(code) { this.statusCode = code; return this }, json(body) { this.body = body }
  }
  try {
    assert.equal(await enforceSharedRateLimit(request(), response, 'sign-in/email', {
      requestId: 'request-123',
      ...options
    }), false)
    return { response, logs }
  } finally { console.error = previousError }
}

test('missing configuration fails closed with a safe correlated category', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  try {
    const { response, logs } = await captureFailure({ keySecret: 'rate-limit-secret' })
    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.body, {
      error: 'Authentication is temporarily unavailable.',
      requestId: 'request-123'
    })
    assert.deepEqual(logs, [[
      'Shared authentication rate limiter unavailable',
      { category: 'configuration', requestId: 'request-123' }
    ]])
    assert.equal(JSON.stringify({ response, logs }).includes('rate-limit-secret'), false)
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken
  }
})

test('SDK command failures fail closed without leaking private inputs or raw errors', async () => {
  const privateValues = [
    'redis://user:token@private.example',
    'rate-limit-secret',
    'pourfolio:auth:signin:raw-key',
    'Person@Example.COM',
    '203.0.113.8',
    'SDK exploded with token details'
  ]
  const { response, logs } = await captureFailure({
    keySecret: privateValues[1],
    redis: { eval: async () => { throw new Error(privateValues.join(' ')) } }
  })
  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.body, {
    error: 'Authentication is temporarily unavailable.',
    requestId: 'request-123'
  })
  assert.deepEqual(logs, [[
    'Shared authentication rate limiter unavailable',
    { category: 'sdk_command', requestId: 'request-123' }
  ]])
  const capturedOutput = JSON.stringify({ response, logs })
  for (const privateValue of privateValues) assert.equal(capturedOutput.includes(privateValue), false)
})
