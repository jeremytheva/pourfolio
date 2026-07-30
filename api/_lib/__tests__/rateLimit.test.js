import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSharedRateLimitKey,
  checkSharedRateLimit,
  enforceSharedRateLimit,
  normaliseAccountIdentifier
} from '../rateLimit.js'

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

test('shared store failure fails authentication closed without leaking details', async () => {
  const previousError = console.error
  console.error = () => {}
  const response = {
    setHeader() {}, status(code) { this.statusCode = code; return this }, json(body) { this.body = body }
  }
  try {
    assert.equal(await enforceSharedRateLimit(request(), response, 'sign-in/email', {
      keySecret: 'secret',
      redis: { eval: async () => { throw new Error('store unavailable') } }
    }), false)
    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.body, { error: 'Authentication is temporarily unavailable.' })
  } finally { console.error = previousError }
})
