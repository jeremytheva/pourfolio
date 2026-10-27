import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { classifySessionRole, runAdminRoleSourceAssessment } from '../admin-role-source-assessment.js'

const targetSha = 'a'.repeat(40)
const configuration = {
  ADMIN_ROLE_ASSESSMENT_SHA: 'b'.repeat(40), ADMIN_ROLE_TARGET_SHA: targetSha,
  ADMIN_ROLE_ASSESSMENT_CONFIRMATION: 'RUN READ ONLY ADMIN ROLE ASSESSMENT',
  RELEASE_OWNER_EMAIL: 'private-one@example.invalid', RELEASE_OWNER_PASSWORD: 'private-password-1',
  RELEASE_OTHER_EMAIL: 'private-two@example.invalid', RELEASE_OTHER_PASSWORD: 'private-password-2'
}
const body = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } })
const fixture = ({ roles = ['Admin', 'User'], omitRole = false, stale = false, reject = false, wrongEmail = false, logoutFails = false, duplicateId = false, reverseCapabilities = false } = {}) => {
  const calls = []
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url)
    calls.push({ path: parsed.pathname, method: init.method, cookie: init.headers?.cookie })
    assert.equal(parsed.origin, 'https://brew-buds-mobile-app-design-3577.vercel.app')
    assert.ok(init.signal)
    if (parsed.pathname === '/api/readiness') {
      assert.equal(init.method, 'GET')
      assert.equal(init.redirect, 'manual')
      return body({ status: 'ready', release: { commitSha: stale ? 'c'.repeat(40) : targetSha, environment: 'production' }, checks: { dataProvider: 'ok' } })
    }
    assert.equal(init.redirect, 'error')
    assert.equal(init.headers.origin, parsed.origin)
    if (parsed.pathname.endsWith('/sign-in/email')) {
      assert.equal(init.method, 'POST')
      const input = JSON.parse(init.body)
      assert.deepEqual(Object.keys(input), ['email', 'password'])
      const index = input.email === configuration.RELEASE_OWNER_EMAIL ? 0 : 1
      assert.equal(input.password, configuration[index ? 'RELEASE_OTHER_PASSWORD' : 'RELEASE_OWNER_PASSWORD'])
      if (reject) return body({ error: 'private provider error' }, 401)
      return body({}, 200, { 'set-cookie': `session=private-cookie-${index}; Path=/; Secure; HttpOnly` })
    }
    const index = init.headers.cookie === 'session=private-cookie-0' ? 0 : 1
    assert.equal(init.headers.cookie, `session=private-cookie-${index}`)
    if (parsed.pathname.endsWith('/profile/capabilities')) {
      const canReview = ['Admin', 'admin'].includes(roles[index]) !== reverseCapabilities
      return body({ version: 1, subjectId: `private-user-${duplicateId ? 0 : index}`, capabilities: canReview ? ['catalogue.review'] : [], mode: 'read_only', moderationAvailable: false })
    }
    if (parsed.pathname.endsWith('/get-session')) {
      assert.equal(init.method, 'GET')
      return body({ user: { id: `private-user-${duplicateId ? 0 : index}`, email: wrongEmail ? 'private-wrong@example.invalid' : configuration[index ? 'RELEASE_OTHER_EMAIL' : 'RELEASE_OWNER_EMAIL'],
        ...(omitRole ? {} : { role: roles[index] }), user_metadata: { role: 'Admin' } } })
    }
    assert.equal(parsed.pathname, '/api/nocodebackend/auth/sign-out')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), {})
    return body({}, logoutFails ? 503 : 200)
  }
  return { calls, fetchImpl }
}

test('role shape observations never infer authority from metadata, missing fields or conflicting identities', () => {
  assert.deepEqual(classifySessionRole({ user: { id: 'one', role: 'Admin' } }), { status: 'OBSERVED', roleClass: 'admin_exact', source: 'user.role', knownRole: 'Admin' })
  assert.equal(classifySessionRole({ data: { user: { id: 'one', role: 'admin' } } }).roleClass, 'near_admin')
  for (const payload of [null, { user: { email: 'private@example.invalid', role: 'Admin' } }, { user: { id: 'one', user_metadata: { role: 'Admin' } } },
    { user: { id: 'one', role: ['Admin'] } }, { user: { id: 'one', role: 'Admin' }, data: { user: { id: 'two', role: 'Admin' } } },
    { user: { id: 'one', role: 'Admin' }, data: { user: { id: 'one', role: 'User' } } }]) {
    assert.equal(classifySessionRole(payload).status, 'UNAVAILABLE')
  }
})

test('configuration, confirmation and distinct-account gates make no network request', async () => {
  for (const environment of [{}, { ...configuration, ADMIN_ROLE_ASSESSMENT_CONFIRMATION: '' }, { ...configuration, ADMIN_ROLE_TARGET_SHA: 'bad' },
    { ...configuration, RELEASE_OTHER_EMAIL: configuration.RELEASE_OWNER_EMAIL }]) {
    const report = await runAdminRoleSourceAssessment({ environment, fetchImpl: () => assert.fail('setup must not authenticate') })
    assert.equal(report.overall, 'SETUP_REQUIRED')
    assert.equal(report.authorityCertified, false)
  }
})

test('two independently verified sessions observe roles and clean up without returning identities or credentials', async () => {
  const f = fixture()
  const report = await runAdminRoleSourceAssessment({ environment: { ...configuration, NOCODEBACKEND_CONTRACT_USER_ID: 'forged' }, fetchImpl: f.fetchImpl })
  assert.equal(report.overall, 'INCONCLUSIVE')
  assert.equal(report.authorityCertified, false)
  assert.equal(report.checks.identitiesDistinct, 'PASS')
  assert.equal(report.checks.roleProjectionAvailable, 'PASS')
  assert.equal(report.checks.exactAdminObserved, 'PASS')
  assert.equal(report.checks.nonAdminObserved, 'PASS')
  assert.equal(report.checks.providerRoleWriteDenial, 'NOT_RUN')
  assert.equal(report.checks.revocation, 'NOT_RUN')
  assert.equal(report.checks.readOnlyCatalogueBoundary, 'PASS')
  assert.equal(report.accounts.every((a) => a.cleanup === 'PASS'), true)
  assert.equal(f.calls.filter((c) => c.path.endsWith('/sign-in/email')).length, 2)
  assert.equal(f.calls.filter((c) => c.path.endsWith('/sign-out')).length, 2)
  assert.equal(JSON.stringify(report).includes('private'), false)
  assert.equal(JSON.stringify(report).includes('forged'), false)
})

test('missing provider role projection and near-match values remain inconclusive after valid authentication', async () => {
  for (const options of [{ omitRole: true }, { roles: ['admin', 'User'] }]) {
    const f = fixture(options)
    const report = await runAdminRoleSourceAssessment({ environment: configuration, fetchImpl: f.fetchImpl })
    assert.equal(report.overall, 'INCONCLUSIVE')
    assert.equal(report.checks.exactAdminObserved, 'INCONCLUSIVE')
    assert.equal(report.authorityCertified, false)
    assert.equal(report.accounts.every((a) => a.cleanup === 'PASS'), true)
  }
})

test('a stale target blocks authentication, and a failed login is never retried or followed by another account', async () => {
  const stale = fixture({ stale: true })
  const preflight = await runAdminRoleSourceAssessment({ environment: configuration, fetchImpl: stale.fetchImpl })
  assert.equal(preflight.overall, 'SETUP_REQUIRED')
  assert.equal(preflight.accounts[0].session, 'NOT_RUN')
  assert.equal(stale.calls.some((c) => c.method === 'POST'), false)
  const rejected = fixture({ reject: true })
  const report = await runAdminRoleSourceAssessment({ environment: configuration, fetchImpl: rejected.fetchImpl })
  assert.equal(report.overall, 'FAIL')
  assert.equal(report.accounts[0].httpStatus, 401)
  assert.equal(rejected.calls.filter((c) => c.path.endsWith('/sign-in/email')).length, 1)
  assert.equal(JSON.stringify(report).includes('private'), false)
})

test('wrong session identity, duplicate identity, transport errors and sign-out failure cannot certify authority', async () => {
  for (const options of [{ wrongEmail: true }, { duplicateId: true }, { logoutFails: true }, { reverseCapabilities: true }]) {
    const f = fixture(options)
    const report = await runAdminRoleSourceAssessment({ environment: configuration, fetchImpl: f.fetchImpl })
    assert.equal(report.overall, 'FAIL')
    assert.equal(report.authorityCertified, false)
    assert.equal(JSON.stringify(report).includes('private'), false)
  }
  const failed = await runAdminRoleSourceAssessment({ environment: configuration, fetchImpl: async () => { throw new Error('private token and cookie') } })
  assert.equal(JSON.stringify(failed).includes('private'), false)
  assert.equal(failed.authorityCertified, false)
})

test('workflow runs only reviewed main, keeps credentials out of installation, and uploads only the redacted summary', () => {
  const workflow = fs.readFileSync('.github/workflows/admin-role-source-assessment.yml', 'utf8')
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/)
  assert.match(workflow, /\[assess-admin-role\]/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /environment: staging-release/)
  assert.match(workflow, /node-version-file: \.nvmrc/)
  assert.match(workflow, /npm run platform:validate/)
  assert.ok(workflow.indexOf('Validate reviewed source') < workflow.indexOf('secrets.RELEASE_OWNER_PASSWORD'))
  assert.match(workflow, /path: artifacts\/admin-role-source-assessment\/summary\.json/)
  assert.doesNotMatch(workflow, /NOCODEBACKEND_SECRET_KEY|RELEASE_SIGNUP|DEBUG:|ACTIONS_STEP_DEBUG/)
})
