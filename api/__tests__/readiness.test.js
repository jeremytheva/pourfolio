import assert from 'node:assert/strict'
import test from 'node:test'

import handler, { __testables } from '../readiness.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY,
  NOCODEBACKEND_DATA_BASE_URL: process.env.NOCODEBACKEND_DATA_BASE_URL,
  NOCODEBACKEND_INSTANCE: process.env.NOCODEBACKEND_INSTANCE
}

const invoke = async () => {
  const result = { headers: {} }
  const response = {
    setHeader(name, value) { result.headers[name] = value },
    status(statusCode) { result.statusCode = statusCode; return this },
    json(body) { result.body = body; return this }
  }
  await handler({ method: 'GET', headers: {} }, response)
  return result
}

test.beforeEach(() => {
  process.env.NOCODEBACKEND_SECRET_KEY = 'server-secret'
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://api.nocodebackend.com/'
  process.env.NOCODEBACKEND_INSTANCE = '54026_rating'
})

test.afterEach(() => { global.fetch = originalFetch })

test.after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('readiness reports ready after a bounded products read', async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ data: [{ id: 1 }] })
  })
  const result = await invoke()
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, { status: 'ready', checks: { dataProvider: 'ok' } })
})

test('readiness reports provider authorisation failures without leaking upstream details', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 403,
    text: async () => JSON.stringify({ error: 'private upstream detail' })
  })
  const result = await invoke()
  assert.equal(result.statusCode, 503)
  assert.deepEqual(result.body, { status: 'degraded', checks: { dataProvider: 'forbidden' } })
  assert.equal(JSON.stringify(result.body).includes('private upstream detail'), false)
})

test('provider readiness states remain stable and machine-readable', () => {
  assert.equal(__testables.providerState({ code: 'DATA_CONFIGURATION_MISSING' }), 'misconfigured')
  assert.equal(__testables.providerState({ code: 'DATA_CONFIGURATION_INVALID' }), 'misconfigured')
  assert.equal(__testables.providerState({ code: 'DATA_CREDENTIAL_MISSING' }), 'misconfigured')
  assert.equal(__testables.providerState({ code: 'DATA_PROVIDER_UNAUTHENTICATED' }), 'unauthenticated')
  assert.equal(__testables.providerState({ code: 'DATA_PROVIDER_FORBIDDEN' }), 'forbidden')
  assert.equal(__testables.providerState({ status: 404 }), 'contract-mismatch')
  assert.equal(__testables.providerState({ status: 502 }), 'unavailable')
})
