import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogueReviewCapabilities } from '../adminReviewAccess.js'
import { requireSessionUser } from '../authSession.js'

const setup = (context, payload) => {
  for (const [key, value] of Object.entries({ NOCODEBACKEND_AUTH_SECRET_KEY: 'test-secret', NOCODEBACKEND_INSTANCE: 'test-instance', NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth' })) {
    const previous = process.env[key]; process.env[key] = value
    context.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous })
  }
  let reads = 0
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(new URL(url).pathname, '/api/user-auth/get-session')
    assert.equal(init.headers.cookie, 'session=test-cookie')
    reads += 1
    return new Response(JSON.stringify(typeof payload === 'function' ? payload() : payload), { headers: { 'content-type': 'application/json' } })
  })
  return () => reads
}
const request = () => ({ headers: { cookie: 'session=test-cookie' }, body: { role: 'Admin', user_id: 'forged' }, query: { role: 'Admin' } })

test('one fresh verified provider response projects only read-only catalogue review', async (context) => {
  const reads = setup(context, { user: { id: 'user-1', role: 'admin', email: 'private@example.invalid', secret_key: 'private' } })
  assert.deepEqual(await catalogueReviewCapabilities(request()), { version: 1, subjectId: 'user-1', capabilities: ['catalogue.review'], mode: 'read_only', moderationAvailable: false })
  assert.equal(reads(), 1)
})

test('only explicit Admin/admin values qualify; unknown/whitespace variants and browser hints do not', async (context) => {
  let role = 'Admin'
  setup(context, () => ({ user: { id: 'user-1', role, user_metadata: { role: 'Admin' } } }))
  for (const value of ['Admin', 'admin', 'user', 'User', 'ADMIN', 'Admin ', 'SuperAdmin', 'unknown']) {
    role = value
    const result = await catalogueReviewCapabilities(request())
    assert.deepEqual(result.capabilities, ['Admin', 'admin'].includes(value) ? ['catalogue.review'] : [])
    assert.equal(result.moderationAvailable, false)
  }
})

test('missing or malformed source fields cannot be replaced by metadata or another session envelope', async (context) => {
  let payload
  setup(context, () => payload)
  for (const value of [{ user: { id: 'user-1', user_metadata: { role: 'Admin' } } },
    { data: { user: { id: 'user-1', role: 'admin' } } }, { user: { id: 'user-1', role: null } },
    { user: { id: 'user-1', role: ['Admin'] } }]) {
    payload = value
    await assert.rejects(catalogueReviewCapabilities(request()), { status: 503, code: 'ADMIN_AUTHORITY_UNAVAILABLE' })
  }
})

test('ordinary session identity projection still omits role and each review request observes current provider role', async (context) => {
  let role = 'admin'
  const reads = setup(context, () => ({ user: { id: 'user-1', role } }))
  assert.deepEqual(await requireSessionUser(request()), { id: 'user-1', email: null, name: null })
  assert.equal((await catalogueReviewCapabilities(request())).capabilities.length, 1)
  role = 'user'
  assert.deepEqual((await catalogueReviewCapabilities(request())).capabilities, [])
  assert.equal(reads(), 3)
})
