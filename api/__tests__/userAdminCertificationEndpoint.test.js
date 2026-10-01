import assert from 'node:assert/strict'
import test from 'node:test'

import handler, { USER_ADMIN_CERTIFICATION_CONFIRMATION } from '../certification/user-admin.js'
import { __resetRateLimitsForTests } from '../_lib/httpSecurity.js'

const originalFetch = global.fetch
const environmentNames = [
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_SHA',
  'NOCODEBACKEND_AUTH_BASE_URL',
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_AUTH_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE',
  'NOCODEBACKEND_USER_EMAIL',
  'NOCODEBACKEND_USER_SECRET_KEY',
  'NOCODEBACKEND_ADMIN_EMAIL',
  'NOCODEBACKEND_ADMIN_SECRET_KEY'
]
const originalEnvironment = Object.fromEntries(environmentNames.map((name) => [name, process.env[name]]))

const configure = () => {
  process.env.VERCEL = '1'
  process.env.VERCEL_ENV = 'preview'
  process.env.VERCEL_GIT_COMMIT_SHA = 'b'.repeat(40)
  process.env.NOCODEBACKEND_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://api.nocodebackend.com/'
  process.env.NOCODEBACKEND_AUTH_SECRET_KEY = 'auth-secret'
  process.env.NOCODEBACKEND_INSTANCE = 'test-instance'
  process.env.NOCODEBACKEND_USER_EMAIL = 'user@example.test'
  process.env.NOCODEBACKEND_USER_SECRET_KEY = 'user-secret'
  process.env.NOCODEBACKEND_ADMIN_EMAIL = 'admin@example.test'
  process.env.NOCODEBACKEND_ADMIN_SECRET_KEY = 'admin-secret'
}

const mockResponse = () => {
  const headers = new Map()
  return {
    statusCode: 200,
    payload: null,
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    getHeader(name) { return headers.get(name.toLowerCase()) },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
}

test.beforeEach(() => {
  configure()
  __resetRateLimitsForTests()
  global.fetch = async (url) => {
    if (String(url).includes('/api/user-auth/providers')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ providers: { email: true } }) }
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ status: 'success', data: [] }) }
  }
})

test.afterEach(() => { global.fetch = originalFetch })
test.after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('preview endpoint returns only a sanitized read-only capability report', async () => {
  const response = mockResponse()
  await handler({
    method: 'POST',
    headers: {
      host: 'preview.example.test',
      origin: 'https://preview.example.test',
      'x-vercel-forwarded-for': '203.0.113.10'
    },
    body: { confirmation: USER_ADMIN_CERTIFICATION_CONFIRMATION }
  }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.payload.overall, 'INCONCLUSIVE')
  assert.equal(response.payload.checks.userSecretKeyDataAccess, 'PASS')
  assert.equal(response.payload.checks.adminSecretKeyDataAccess, 'PASS')
  assert.equal(response.payload.checks.accountSessionAuthentication, 'SETUP_REQUIRED')

  const serialized = JSON.stringify(response.payload)
  assert.doesNotMatch(serialized, /user@example|admin@example|user-secret|admin-secret|auth-secret|test-instance/)
})

test('endpoint is hidden outside Vercel preview', async () => {
  process.env.VERCEL_ENV = 'production'
  const response = mockResponse()
  await handler({
    method: 'POST',
    headers: {},
    body: { confirmation: USER_ADMIN_CERTIFICATION_CONFIRMATION }
  }, response)
  assert.equal(response.statusCode, 404)
})

test('endpoint requires explicit read-only confirmation', async () => {
  const response = mockResponse()
  await handler({
    method: 'POST',
    headers: { host: 'preview.example.test', origin: 'https://preview.example.test' },
    body: { confirmation: 'wrong' }
  }, response)
  assert.equal(response.statusCode, 400)
})

test('endpoint rejects non-POST methods in preview', async () => {
  const response = mockResponse()
  await handler({ method: 'GET', headers: {} }, response)
  assert.equal(response.statusCode, 405)
  assert.equal(response.getHeader('allow'), 'POST')
})
