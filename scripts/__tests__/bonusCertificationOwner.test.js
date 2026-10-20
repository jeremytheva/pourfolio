import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBonusCertificationOwner } from '../bonus-certification-owner.js'

const environment = {
  BONUS_CERTIFICATION_BASE_URL: 'https://pourfolio-test-jeremythevas-projects.vercel.app',
  BONUS_CERTIFICATION_AUTH_SHA: 'a'.repeat(40),
  BONUS_CERTIFICATION_SHA: 'c'.repeat(40),
  RELEASE_OWNER_EMAIL: 'Owner@example.test', RELEASE_OWNER_PASSWORD: 'private-login-password'
}
const fixture = (options = {}) => {
  const calls = []
  const fetchImpl = async (input, init) => {
    const url = new URL(input)
    const action = url.pathname.split('/').at(-1)
    calls.push({ url, init, action })
    if (action === 'readiness') {
      assert.equal(init.headers.cookie, undefined)
      assert.equal(init.headers.authorization, undefined)
      return new Response(JSON.stringify({ status: 'ready',
        release: { commitSha: options.wrongSha ? 'b'.repeat(40) : environment.BONUS_CERTIFICATION_AUTH_SHA, environment: 'preview' },
        checks: { dataProvider: 'ok' } }), { status: options.readinessStatus || 200 })
    }
    assert.equal(url.origin, environment.BONUS_CERTIFICATION_BASE_URL)
    if (action === 'breakdown') {
      assert.equal(options.allowRatingRead, true)
      assert.equal(url.pathname, '/api/nocodebackend/ratings/622/breakdown')
      assert.equal(init.method, 'GET')
      assert.equal(init.body, undefined)
      assert.equal(init.redirect, 'error')
      assert.equal(init.headers.cookie, 'test-session=private-cookie')
      return new Response('{"error":"private-response-body"}', { status: 403 })
    }
    assert.equal(url.pathname.startsWith('/api/nocodebackend/auth/'), true)
    assert.equal(init.headers.origin, environment.BONUS_CERTIFICATION_BASE_URL)
    assert.equal(init.headers.authorization, undefined)
    assert.equal(init.redirect, 'error')
    if (options.unavailable) throw new Error('Sensitive provider error, do not disclose')
    if (action === 'email') return new Response('{}', {
      status: options.loginStatus || 200,
      headers: options.noCookie ? {} : { 'set-cookie': 'test-session=private-cookie; HttpOnly; Path=/' }
    })
    assert.equal(init.headers.cookie, 'test-session=private-cookie')
    if (action === 'get-session') return new Response(JSON.stringify(options.session ?? {
      user: { id: 'verified-private-owner', email: 'owner@example.test' }
    }), { status: options.sessionStatus || 200 })
    if (action === 'sign-out') return new Response('{}', { status: options.signoutStatus || 200 })
    throw new Error('Unexpected request')
  }
  return { calls, run: (env = environment, inspectSession = null) =>
    resolveBonusCertificationOwner({ environment: env, fetchImpl, inspectSession }) }
}

test('a configured contract owner requires no authentication calls', async () => {
  const f = fixture()
  assert.deepEqual(await f.run({ NOCODEBACKEND_CONTRACT_USER_ID: ' configured-owner ' }),
    { id: 'configured-owner', source: 'configured-contract-user' })
  assert.equal(f.calls.length, 0)
})

test('missing both owner configurations blocks before any request and exposes names only', async () => {
  const f = fixture()
  await assert.rejects(f.run({}), (error) => error.code === 'RUNTIME_CONFIGURATION_MISSING' &&
    error.missing.includes('NOCODEBACKEND_CONTRACT_USER_ID') && error.missing.includes('RELEASE_OWNER_PASSWORD'))
  assert.equal(f.calls.length, 0)
})

test('release authentication resolves the session owner and signs out before returning its ID', async () => {
  const f = fixture()
  assert.deepEqual(await f.run(), { id: 'verified-private-owner', source: 'verified-release-session',
    authCommit: environment.BONUS_CERTIFICATION_AUTH_SHA })
  assert.deepEqual(f.calls.map((call) => call.action), ['readiness', 'email', 'get-session', 'sign-out'])
  assert.deepEqual(JSON.parse(f.calls[1].init.body), {
    email: 'Owner@example.test', password: 'private-login-password'
  })
})

test('wrong release provenance sends no account credentials', async () => {
  const f = fixture({ wrongSha: true })
  await assert.rejects(f.run(), (error) => error.code === 'BONUS_TEST_OWNER_TARGET_UNVERIFIED')
  assert.deepEqual(f.calls.map((call) => call.action), ['readiness'])
})

test('an unapproved deployment URL receives no request or credentials', async () => {
  const f = fixture()
  await assert.rejects(f.run({ ...environment, BONUS_CERTIFICATION_BASE_URL: 'https://other.example' }),
    (error) => error.code === 'BONUS_TEST_OWNER_TARGET_UNVERIFIED')
  assert.equal(f.calls.length, 0)
})

test('unverified release access records its HTTP status and sends no account credentials', async () => {
  const f = fixture({ readinessStatus: 401 })
  await assert.rejects(f.run(), (error) => error.code === 'BONUS_TEST_OWNER_TARGET_UNVERIFIED' && error.targetStatus === 401)
  assert.deepEqual(f.calls.map((call) => call.action), ['readiness'])
})

for (const [name, options, code] of [
  ['rejected login', { loginStatus: 401 }, 'BONUS_TEST_OWNER_AUTH_REJECTED'],
  ['missing cookie', { noCookie: true }, 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED'],
  ['rejected session', { sessionStatus: 401 }, 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED'],
  ['wrong account', { session: { user: { id: 'foreign-owner', email: 'other@example.test' } } }, 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED'],
  ['missing session email', { session: { user: { id: 'unknown-owner' } } }, 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED'],
  ['unavailable authentication', { unavailable: true }, 'BONUS_TEST_OWNER_AUTH_UNAVAILABLE'],
  ['unconfirmed sign-out', { signoutStatus: 503 }, 'BONUS_TEST_OWNER_SIGNOUT_UNCONFIRMED']
]) {
  test(`${name} cannot return an owner or disclose credentials`, async () => {
    const f = fixture(options)
    await assert.rejects(f.run(), (error) => {
      assert.equal(error.code, code)
      const text = JSON.stringify(error) + error.message
      for (const value of Object.values(environment)) assert.equal(text.includes(value), false)
      assert.equal(text.includes('private-cookie'), false)
      return true
    })
    if (!options.noCookie && !options.unavailable) assert.equal(f.calls.at(-1).action, 'sign-out')
  })
}

test('a wrong account plus sign-out failure preserves both safe failure facts', async () => {
  const f = fixture({ session: { user: { id: 'foreign-owner', email: 'other@example.test' } }, signoutStatus: 503 })
  await assert.rejects(f.run(), (error) => error.code === 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED' &&
    error.sessionCleanup === 'UNCONFIRMED')
})

test('verified-session inspection can issue one same-origin rating GET before guaranteed sign-out', async () => {
  const f = fixture({ allowRatingRead: true })
  let status
  const result = await f.run(environment, async ({ userId, readRatingBreakdown }) => {
    assert.equal(userId, 'verified-private-owner')
    const response = await readRatingBreakdown('622')
    status = response.status
    await response.body.cancel()
  })
  assert.equal(status, 403)
  assert.deepEqual(f.calls.map((call) => call.action), ['readiness', 'email', 'get-session', 'breakdown', 'sign-out'])
  assert.ok(!JSON.stringify(result).includes('private-cookie'))
  assert.ok(!JSON.stringify(result).includes('private-login-password'))
})

test('the inspection reader rejects arbitrary URLs, malformed IDs and repeated requests', async () => {
  const f = fixture({ allowRatingRead: true })
  await f.run(environment, async ({ readRatingBreakdown }) => {
    for (const id of ['0', 'https://other.example', '622?anything=true']) {
      await assert.rejects(readRatingBreakdown(id), { code: 'BONUS_TEST_OWNER_READ_SCOPE_UNCONFIRMED' })
    }
    const response = await readRatingBreakdown('622')
    await response.body.cancel()
    await assert.rejects(readRatingBreakdown('622'), { code: 'BONUS_TEST_OWNER_READ_SCOPE_UNCONFIRMED' })
  })
  assert.equal(f.calls.filter((call) => call.action === 'breakdown').length, 1)
})

test('inspection failure still signs out and preserves separate unconfirmed-session cleanup', async () => {
  for (const signoutStatus of [200, 503]) {
    const f = fixture({ signoutStatus })
    await assert.rejects(f.run(environment, async () => { throw new Error('private-cookie private-response-body') }),
      (error) => error.code === 'BONUS_TEST_OWNER_INSPECTION_FAILED' &&
        !error.message.includes('private-cookie') && (signoutStatus !== 503 || error.sessionCleanup === 'UNCONFIRMED'))
    assert.equal(f.calls.at(-1).action, 'sign-out')
  }
})

test('unverified/configured-only owners cannot run a session observer', async () => {
  const rejected = fixture({ sessionStatus: 401 })
  await assert.rejects(rejected.run(environment, async () => assert.fail('must not inspect')),
    { code: 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED' })
  const configured = fixture()
  await assert.rejects(configured.run({ NOCODEBACKEND_CONTRACT_USER_ID: 'configured-owner' }, async () => {}),
    { code: 'BONUS_TEST_OWNER_SESSION_REQUIRED' })
  await assert.rejects(configured.run(environment, 'invalid'), { code: 'BONUS_TEST_OWNER_INSPECTION_INVALID' })
  assert.equal(configured.calls.length, 0)
})
