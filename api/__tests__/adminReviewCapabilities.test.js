import assert from 'node:assert/strict'
import test from 'node:test'
import handler from '../profile-data-proxy.js'
import { dataProvider } from '../_lib/dataProvider.js'

const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v }, status(code) { this.code = code; return this }, json(payload) { this.payload = payload } })
test('capability route is session bound, read-only and cannot create a profile or read another account', async (context) => {
  for (const [key, value] of Object.entries({ NOCODEBACKEND_AUTH_SECRET_KEY: 'test-secret', NOCODEBACKEND_INSTANCE: 'test-instance', NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth' })) {
    const previous = process.env[key]; process.env[key] = value
    context.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous })
  }
  for (const method of ['get', 'list', 'create', 'update', 'remove']) context.mock.method(dataProvider, method, () => assert.fail('capabilities must not access data collections'))
  let role = 'admin', authenticated = true
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ user: { id: 'session-user', role, email: 'private@example.invalid' } }), { status: authenticated ? 200 : 401, headers: { 'content-type': 'application/json' } }))
  const req = (method = 'GET', path = ['profile', 'capabilities']) => ({ method, headers: { cookie: 'session=test' }, query: { path, user_id: 'other-user' }, body: { role: 'Admin', user_id: 'forged' } })
  const admin = response(); await handler(req(), admin)
  assert.equal(admin.code, 200)
  assert.equal(admin.payload.subjectId, 'session-user')
  assert.deepEqual(admin.payload.capabilities, ['catalogue.review'])
  assert.equal(admin.headers['Cache-Control'], 'no-store')
  assert.equal(JSON.stringify(admin.payload).includes('private'), false)
  role = 'user'
  const ordinary = response(); await handler(req(), ordinary)
  assert.equal(ordinary.code, 200); assert.deepEqual(ordinary.payload.capabilities, [])
  for (const [method, path, expected] of [['PUT', ['profile', 'capabilities'], 404], ['GET', ['profile', 'capabilities', 'extra'], 404], ['DELETE', ['profile', 'capabilities'], 405]]) {
    const reply = response(); await handler(req(method, path), reply); assert.equal(reply.code, expected)
  }
  authenticated = false
  const anonymous = response(); await handler(req(), anonymous); assert.equal(anonymous.code, 401)
})
