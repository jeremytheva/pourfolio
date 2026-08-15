import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTH_RATE_LIMITS,
  buildSharedRateLimitKey,
  checkSharedRateLimit,
  enforceSharedRateLimit,
  normaliseAccountIdentifier,
  RATE_LIMIT_PUBLIC_ERROR_CODES
} from '../rateLimit.js'
import { createInMemoryRedis } from './inMemoryRedis.js'

const request = (email = ' Person@Example.COM ') => ({
  headers: { 'x-vercel-forwarded-for': '203.0.113.8' },
  body: { email }
})

const createResponse = () => ({
  headers: {},
  setHeader(name, value) { this.headers[name] = value },
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body }
})

test('account and client identifiers produce namespaced opaque keys', () => {
  const normalisedEmail = 'person@example.com'
  const clientAddress = '203.0.113.8'
  const key = buildSharedRateLimitKey(request(), 'sign-in/email', 'secret')
  const equivalentKey = buildSharedRateLimitKey(request(normalisedEmail), 'sign-in/email', 'secret')
  const differentAccountKey = buildSharedRateLimitKey(request('other@example.com'), 'sign-in/email', 'secret')
  const differentAddressKey = buildSharedRateLimitKey({
    ...request(),
    headers: { 'x-vercel-forwarded-for': '203.0.113.9' }
  }, 'sign-in/email', 'secret')
  const namespace = 'pourfolio:auth:signin:'

  assert.equal(normaliseAccountIdentifier('  PERSON@example.com '), normalisedEmail)
  assert.equal(key, equivalentKey)
  assert.equal(key.startsWith(namespace), true)
  assert.equal(key.includes(normalisedEmail), false)
  assert.equal(key.includes(clientAddress), false)
  assert.notEqual(key.slice(namespace.length), differentAccountKey.slice(namespace.length))
  assert.notEqual(key.slice(namespace.length), differentAddressKey.slice(namespace.length))
})

const authenticationPolicies = [
  { path: 'sign-up/email', limit: 5, windowMs: 60 * 60_000 },
  { path: 'sign-in/email', limit: 10, windowMs: 15 * 60_000 },
  { path: 'sign-in/otp', limit: 10, windowMs: 15 * 60_000 },
  { path: 'verify-otp', limit: 8, windowMs: 15 * 60_000 }
]

for (const expectedPolicy of authenticationPolicies) {
  test(`${expectedPolicy.path} applies its configured request boundary`, async () => {
    const { path, limit, windowMs } = expectedPolicy
    assert.equal(AUTH_RATE_LIMITS[path].limit, limit)
    assert.equal(AUTH_RATE_LIMITS[path].windowMs, windowMs)

    const redis = createInMemoryRedis()
    const decisions = []
    for (let requestNumber = 1; requestNumber <= limit + 1; requestNumber += 1) {
      decisions.push(await checkSharedRateLimit(request(), path, { keySecret: 'secret', redis }))
    }

    assert.deepEqual(decisions.map(({ count }) => count),
      Array.from({ length: limit + 1 }, (_, index) => index + 1))
    assert.equal(decisions[limit - 1].allowed, true)
    assert.equal(decisions[limit].allowed, false)
    assert.equal(decisions[0].ttlMs, windowMs)

    const response = createResponse()
    assert.equal(await enforceSharedRateLimit(request(), response, path, {
      keySecret: 'secret',
      redis: { eval: async () => [limit, windowMs] }
    }), true)
    assert.equal(response.headers['X-RateLimit-Limit'], String(limit))
    assert.equal(response.headers['X-RateLimit-Remaining'], '0')
  })
}

test('rejected requests retain the generic response and correlation ID', async () => {
  const ttlMs = 60_001
  const response = createResponse()
  assert.equal(await enforceSharedRateLimit(request(), response, 'verify-otp', {
    keySecret: 'secret',
    requestId: 'request-123',
    redis: { eval: async () => [9, ttlMs] }
  }), false)
  assert.equal(response.statusCode, 429)
  assert.equal(response.headers['X-RateLimit-Limit'], String(AUTH_RATE_LIMITS['verify-otp'].limit))
  assert.equal(response.headers['X-RateLimit-Remaining'], '0')
  assert.equal(response.headers['Retry-After'], String(Math.max(1, Math.ceil(ttlMs / 1000))))
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

test('concurrent requests receive unique atomic increments at the policy boundary', async () => {
  const redis = createInMemoryRedis()
  const policy = AUTH_RATE_LIMITS['verify-otp']
  const decisions = await Promise.all(Array.from(
    { length: policy.limit + 1 },
    () => checkSharedRateLimit(request(), 'verify-otp', { keySecret: 'secret', redis })
  ))

  assert.deepEqual(decisions.map(({ count }) => count).sort((left, right) => left - right),
    Array.from({ length: policy.limit + 1 }, (_, index) => index + 1))
  assert.equal(decisions.filter(({ allowed }) => allowed).length, policy.limit)
  assert.equal(decisions.filter(({ allowed }) => !allowed).length, 1)
})

test('a fixed window expires exactly at its boundary and service recovers', async () => {
  const redis = createInMemoryRedis()
  const policy = AUTH_RATE_LIMITS['sign-in/email']
  const options = { keySecret: 'secret', redis }

  await Promise.all(Array.from(
    { length: policy.limit },
    () => checkSharedRateLimit(request(), 'sign-in/email', options)
  ))
  assert.equal((await checkSharedRateLimit(request(), 'sign-in/email', options)).allowed, false)

  redis.advanceTime(policy.windowMs - 1)
  assert.equal((await checkSharedRateLimit(request(), 'sign-in/email', options)).allowed, false)
  redis.advanceTime(1)
  const recovered = await checkSharedRateLimit(request(), 'sign-in/email', options)
  assert.deepEqual({ allowed: recovered.allowed, count: recovered.count, ttlMs: recovered.ttlMs }, {
    allowed: true,
    count: 1,
    ttlMs: policy.windowMs
  })
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

const assertFailureTelemetry = (logs, category) => {
  assert.equal(logs.length, 1)
  assert.equal(logs[0].length, 1)
  assert.deepEqual(JSON.parse(logs[0][0]), {
    route_template: '/api/nocodebackend/auth/:action',
    status_class: '5xx',
    event_name: `authentication_limiter_${category}`,
    correlation_id: 'request-123'
  })
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
      code: RATE_LIMIT_PUBLIC_ERROR_CODES.CONFIGURATION_MISSING,
      requestId: 'request-123'
    })
    assertFailureTelemetry(logs, 'configuration')
    assert.equal(JSON.stringify({ response, logs }).includes('rate-limit-secret'), false)
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken
  }
})

test('a missing rate-limit key secret has the safe configuration code', async () => {
  const { response, logs } = await captureFailure({
    keySecret: '',
    redis: { eval: async () => [1, 60_000] }
  })

  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.body, {
    error: 'Authentication is temporarily unavailable.',
    code: RATE_LIMIT_PUBLIC_ERROR_CODES.CONFIGURATION_MISSING,
    requestId: 'request-123'
  })
  assertFailureTelemetry(logs, 'configuration')
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
    code: RATE_LIMIT_PUBLIC_ERROR_CODES.SERVICE_UNAVAILABLE,
    requestId: 'request-123'
  })
  assertFailureTelemetry(logs, 'sdk_command')
  const capturedOutput = JSON.stringify({ response, logs })
  for (const privateValue of privateValues) assert.equal(capturedOutput.includes(privateValue), false)
})

test('provider latency does not weaken the limit and a later command recovers', async () => {
  let releaseCommand
  let calls = 0
  const redis = {
    eval: async () => {
      calls += 1
      if (calls === 1) await new Promise((resolve) => { releaseCommand = resolve })
      return [calls, 60_000]
    }
  }
  const pending = checkSharedRateLimit(request(), 'sign-in/email', { keySecret: 'secret', redis })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(typeof releaseCommand, 'function')
  releaseCommand()
  assert.equal((await pending).count, 1)
  assert.equal((await checkSharedRateLimit(request(), 'sign-in/email', {
    keySecret: 'secret', redis
  })).count, 2)
})

const invalidProviderPrivateValue = 'redis://account:credential@private.example/key'
for (const [name, result] of [
  ['non-array', { count: 1, ttl: 60_000 }],
  ['missing expiry', [1, -1]],
  ['expired key', [1, -2]],
  ['zero counter', [0, 60_000]],
  ['fractional counter', [1.5, 60_000]],
  ['expiry beyond the fixed window', [1, AUTH_RATE_LIMITS['sign-in/email'].windowMs + 1]],
  ['non-numeric values', [invalidProviderPrivateValue, invalidProviderPrivateValue]]
]) {
  test(`invalid provider result (${name}) fails closed with only a safe category`, async () => {
    const { response, logs } = await captureFailure({
      keySecret: 'rate-limit-secret',
      redis: { eval: async () => result }
    })

    assert.equal(response.statusCode, 503)
    assert.equal(response.body.code, RATE_LIMIT_PUBLIC_ERROR_CODES.SERVICE_UNAVAILABLE)
    assertFailureTelemetry(logs, 'invalid_result')
    assert.equal(JSON.stringify({ response, logs }).includes(invalidProviderPrivateValue), false)
  })
}
