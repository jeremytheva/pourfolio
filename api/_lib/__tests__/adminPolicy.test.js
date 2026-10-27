import assert from 'node:assert/strict'
import test from 'node:test'
import { ADMIN_CAPABILITIES, createAdminAuthorizer } from '../adminPolicy.js'

const session = async () => ({ id: 'session-user', email: 'private@example.invalid', role: 'Admin' })
const role = async (userId) => ({ userId, role: 'Admin' })
const authorize = (options = {}) => createAdminAuthorizer({ resolveSession: session, readRole: role, ...options })
const rejects = (promise, status, code) => assert.rejects(promise, (error) => {
  assert.equal(error.status, status)
  assert.equal(error.code, code)
  assert.equal(JSON.stringify({ message: error.message, ...error }).includes('private'), false)
  assert.equal(error.payload, undefined)
  assert.equal(error.cause, undefined)
  return true
})

test('only a matching trusted Admin record grants the bounded catalogue capabilities', async () => {
  const calls = []
  const request = { body: { user_id: 'forged', role: 'Admin' }, query: { role: 'Admin' } }
  const guard = authorize({ readRole: async (id, options) => { calls.push([id, options]); return role(id) } })
  const signal = new AbortController().signal
  const result = await guard(request, { capability: 'catalogue.moderate', signal })
  assert.deepEqual(calls, [['session-user', { signal }]])
  assert.deepEqual(result, { userId: 'session-user', capabilities: ['catalogue.review', 'catalogue.moderate', 'catalogue.correct', 'catalogue.audit'] })
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.capabilities), true)
  assert.throws(() => result.capabilities.push('private.read'), TypeError)
})

test('anonymous and malformed sessions cannot trigger a role lookup', async () => {
  for (const user of [null, undefined, {}, { email: 'private@example.invalid' }, { id: '' }, { id: 1 }, { id: 'bad id' }]) {
    const guard = authorize({ resolveSession: async () => user, readRole: () => assert.fail('must authenticate first') })
    await rejects(guard({ body: { id: 'forged', role: 'Admin' } }), 401, 'AUTH_SESSION_REQUIRED')
  }
})

test('session failures are redacted and never become Administrator authority', async () => {
  for (const status of [401, 403, 502, undefined]) {
    const guard = authorize({ resolveSession: async () => { throw Object.assign(new Error('private upstream token'), { status, payload: { private: true } }) } })
    await rejects(guard({}), status === 401 ? 401 : 503, status === 401 ? 'AUTH_SESSION_REQUIRED' : 'ADMIN_AUTHORITY_UNAVAILABLE')
  }
})

test('authenticated users have no Admin authority when a trusted role adapter is absent', async () => {
  for (const readRole of [undefined, null, 'Admin', { role: 'Admin' }]) {
    await rejects(authorize({ readRole })({ body: { role: 'Admin' } }), 503, 'ADMIN_AUTHORITY_UNAVAILABLE')
  }
})

test('ordinary, unknown and near-match roles are denied despite client or session Admin hints', async () => {
  for (const value of ['User', 'admin', 'ADMIN', ' Admin', 'Admin ', 'SuperAdmin', 'Administrator', 'unknown']) {
    const guard = authorize({ readRole: async (userId) => ({ userId, role: value }) })
    await rejects(guard({ headers: { 'x-role': 'Admin' }, body: { role: 'Admin' } }), 403, 'ADMIN_CAPABILITY_DENIED')
  }
})

test('missing, wrong-owner, malformed and excessive role projections fail closed', async () => {
  const invalid = [null, [], {}, { userId: 'someone-else', role: 'Admin' },
    { userId: 'session-user', role: null }, { userId: 'session-user', role: '' },
    { userId: 'session-user', role: ['Admin'] }, { userId: 'session-user', role: 'x'.repeat(51) },
    { userId: 'session-user', role: 'Admin', email: 'private@example.invalid' },
    Object.create({ userId: 'session-user', role: 'Admin' })]
  for (const record of invalid) {
    await rejects(authorize({ readRole: async () => record })({}), 503, 'ADMIN_AUTHORITY_UNAVAILABLE')
  }
})

test('role lookup errors discard raw messages, payloads and causes', async () => {
  const guard = authorize({ readRole: async () => { throw Object.assign(new Error('private provider credential'), { payload: { private: true }, cause: 'private' }) } })
  await rejects(guard({}), 503, 'ADMIN_AUTHORITY_UNAVAILABLE')
})

test('demotion is observed on the next request without a role cache', async () => {
  let currentRole = 'Admin', reads = 0
  const guard = authorize({ readRole: async (userId) => { reads += 1; return { userId, role: currentRole } } })
  await guard({})
  currentRole = 'User'
  await rejects(guard({}), 403, 'ADMIN_CAPABILITY_DENIED')
  assert.equal(reads, 2)
})

test('private data, role grants and scoring controls cannot be requested as catalogue capabilities', async () => {
  const guard = authorize({ readRole: () => assert.fail('unsupported capability must not read role') })
  for (const capability of ['ratings.private.read', 'cellar.read', 'users.roles.write', 'scores.write', '*', '', null, {}, ['catalogue.review']]) {
    await rejects(guard({}, { capability }), 403, 'ADMIN_CAPABILITY_DENIED')
  }
  assert.deepEqual(ADMIN_CAPABILITIES.length, 4)
})

test('each supported capability resolves the session and authoritative role afresh', async () => {
  let sessionReads = 0, roleReads = 0
  const controller = new AbortController()
  const request = { headers: {} }
  const guard = authorize({
    resolveSession: async (received, options) => { assert.equal(received, request); assert.equal(options.signal, controller.signal); sessionReads += 1; return { id: 'session-user' } },
    readRole: async (userId, options) => { assert.equal(options.signal, controller.signal); roleReads += 1; return role(userId) }
  })
  for (const capability of ADMIN_CAPABILITIES) await guard(request, { capability, signal: controller.signal })
  assert.equal(sessionReads, 4)
  assert.equal(roleReads, 4)
})

test('cancellation before or during authority resolution cannot grant a principal', async () => {
  for (const stage of ['before', 'session', 'role']) {
    const controller = new AbortController()
    if (stage === 'before') controller.abort()
    const guard = authorize({
      resolveSession: async () => {
        if (stage === 'before') assert.fail('already cancelled')
        if (stage === 'session') controller.abort()
        return { id: 'session-user' }
      },
      readRole: async (userId) => {
        if (stage !== 'role') assert.fail('must stop before role lookup')
        controller.abort()
        return role(userId)
      }
    })
    await rejects(guard({}, { signal: controller.signal }), 503, 'ADMIN_AUTHORITY_UNAVAILABLE')
  }
})
