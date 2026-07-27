import assert from 'node:assert/strict'
import test from 'node:test'
import {
  __resetRateLimitsForTests,
  enforceRateLimit,
  isSameOriginRequest,
  requestBodySize
} from '../httpSecurity.js'

test('same-origin browser requests are accepted', () => {
  assert.equal(isSameOriginRequest({
    headers: { origin: 'https://pourfolio.example', host: 'pourfolio.example' }
  }), true)
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
  const request = { headers: { 'x-forwarded-for': '127.0.0.1' } }

  assert.equal(enforceRateLimit(request, response, { key: 'test', limit: 1 }), true)
  assert.equal(enforceRateLimit(request, response, { key: 'test', limit: 1 }), false)
  assert.equal(response.statusCode, 429)
  assert.equal(headers['Retry-After'] !== undefined, true)
})
