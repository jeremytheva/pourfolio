import assert from 'node:assert/strict'
import test from 'node:test'
import {
  __rateLimitBucketCountForTests,
  __resetRateLimitsForTests,
  enforceRateLimit,
  getClientAddress,
  isSameOriginRequest,
  requestBodySize
} from '../httpSecurity.js'

test('same-origin browser requests are accepted', () => {
  assert.equal(isSameOriginRequest({
    headers: { origin: 'https://pourfolio.example', host: 'pourfolio.example' }
  }), true)
})

test('client address ignores spoofable x-forwarded-for', () => {
  assert.equal(getClientAddress({
    headers: {
      'x-vercel-forwarded-for': '203.0.113.1',
      'x-forwarded-for': '198.51.100.9'
    }
  }), '203.0.113.1')
})

test('cross-origin browser requests are rejected by default', () => {
  assert.equal(isSameOriginRequest({
    headers: { origin: 'https://attacker.example', host: 'pourfolio.example' }
  }), false)
})

test('request body size is measured when content-length is absent', () => {
  assert.equal(requestBodySize({ headers: {}, body: { name: 'Pourfolio' } }), 20)
})

test('rate limiting rejects requests above the configured bucket limit', () => {
  __resetRateLimitsForTests()
  const headers = {}
  const response = {
    setHeader(name, value) { headers[name] = value },
    status(value) { this.statusCode = value; return this },
    json(value) { this.body = value }
  }
  const request = { headers: { 'x-vercel-forwarded-for': '127.0.0.1' } }

  assert.equal(enforceRateLimit(request, response, { key: 'test', limit: 1 }), true)
  assert.equal(enforceRateLimit(request, response, { key: 'test', limit: 1 }), false)
  assert.equal(response.statusCode, 429)
  assert.equal(headers['Retry-After'] !== undefined, true)
})

test('expired local buckets are cleaned and attacker-generated state is bounded', () => {
  __resetRateLimitsForTests()
  const originalNow = Date.now
  let now = 1_000
  Date.now = () => now
  const response = { setHeader() {}, status() { return this }, json() {} }
  try {
    enforceRateLimit({ headers: { 'x-vercel-forwarded-for': 'expired' } }, response, { windowMs: 1 })
    now += 2
    for (let index = 0; index < 5_100; index += 1) {
      enforceRateLimit({ headers: { 'x-vercel-forwarded-for': String(index) } }, response)
    }
    assert.equal(__rateLimitBucketCountForTests() <= 5_000, true)
  } finally {
    Date.now = originalNow
    __resetRateLimitsForTests()
  }
})
