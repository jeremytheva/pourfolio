import assert from 'node:assert/strict'
import test from 'node:test'

import profileHandler from '../profile-data-proxy.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY,
  NOCODEBACKEND_INSTANCE: process.env.NOCODEBACKEND_INSTANCE,
  NOCODEBACKEND_AUTH_BASE_URL: process.env.NOCODEBACKEND_AUTH_BASE_URL
}

const createResponse = () => ({
  headers: {},
  statusCode: null,
  body: null,
  setHeader(name, value) { this.headers[name] = value },
  status(statusCode) { this.statusCode = statusCode; return this },
  json(body) { this.body = body; return this }
})

test.beforeEach(() => {
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-secret'
  process.env.NOCODEBACKEND_INSTANCE = 'test-instance'
  process.env.NOCODEBACKEND_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
})

test.afterEach(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('GET profile returns the authenticated session user without reading a profiles collection', async () => {
  const requests = []
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    return new Response(JSON.stringify({ user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  }

  const response = createResponse()
  await profileHandler({ method: 'GET', headers: { cookie: 'session=test' } }, response)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, {
    profile: { id: 'user-1', name: 'Test User', description: '', avatar_url: null }
  })
  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/get-session\?instance=test-instance$/)
  assert.equal(requests[0].url.includes('/read/profiles'), false)
})

test('PUT profile fails explicitly while profile persistence is not deployed', async () => {
  global.fetch = async () => new Response(JSON.stringify({ user: { id: 'user-1', name: 'Test User' } }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })

  const response = createResponse()
  await profileHandler({ method: 'PUT', headers: { cookie: 'session=test' }, body: { name: 'Changed' } }, response)

  assert.equal(response.statusCode, 503)
  assert.equal(response.body.code, 'profile_persistence_unavailable')
})
