import assert from 'node:assert/strict'
import test from 'node:test'

import { runUserAdminCertification } from '../userAdminCertification.js'

const environment = {
  NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth',
  NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
  NOCODEBACKEND_AUTH_SECRET_KEY: 'auth-secret',
  NOCODEBACKEND_INSTANCE: 'test-instance',
  NOCODEBACKEND_USER_EMAIL: 'user@example.test',
  NOCODEBACKEND_USER_SECRET_KEY: 'user-data-secret',
  NOCODEBACKEND_ADMIN_EMAIL: 'admin@example.test',
  NOCODEBACKEND_ADMIN_SECRET_KEY: 'admin-data-secret'
}

const response = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload)
})

test('read-only certification verifies both data keys without using them as login passwords', async () => {
  const requests = []
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options })
    if (String(url).includes('/api/user-auth/providers')) {
      return response({ providers: { email: true, google: false } })
    }
    return response({ status: 'success', data: [] })
  }

  const report = await runUserAdminCertification({
    environment,
    fetchImpl,
    release: { commitSha: 'a'.repeat(40), environment: 'preview' }
  })

  assert.equal(report.overall, 'INCONCLUSIVE')
  assert.equal(report.checks.authProviderReachable, 'PASS')
  assert.equal(report.checks.userSecretKeyDataAccess, 'PASS')
  assert.equal(report.checks.adminSecretKeyDataAccess, 'PASS')
  assert.equal(report.checks.accountSessionAuthentication, 'SETUP_REQUIRED')
  assert.equal(report.safeCodes.accountSession, 'LOGIN_PASSWORD_OR_SUPPORTED_OTP_REQUIRED')
  assert.equal(report.checks.ownerIsolation, 'INCONCLUSIVE')
  assert.equal(report.checks.ratingMigrationUntouched, 'PASS')
  assert.equal(report.cleanup, 'NOT_REQUIRED')

  assert.equal(requests.length, 3)
  assert.equal(requests.some(({ url }) => url.includes('sign-in')), false)
  assert.equal(requests.filter(({ url }) => url.includes('/read/products')).length, 2)

  const serialized = JSON.stringify(report)
  for (const protectedValue of Object.values(environment)) {
    assert.equal(serialized.includes(protectedValue), false)
  }
})

test('missing credentials return SETUP_REQUIRED without calling the provider', async () => {
  let called = false
  const report = await runUserAdminCertification({
    environment: {
      ...environment,
      NOCODEBACKEND_ADMIN_SECRET_KEY: ''
    },
    fetchImpl: async () => {
      called = true
      return response({})
    }
  })

  assert.equal(called, false)
  assert.equal(report.overall, 'SETUP_REQUIRED')
  assert.equal(report.setupRequired.code, 'CERTIFICATION_CREDENTIALS_MISSING')
  assert.deepEqual(report.setupRequired.missing, ['NOCODEBACKEND_ADMIN_SECRET_KEY'])
})

test('a rejected key fails the certification without revealing provider detail', async () => {
  let dataRequest = 0
  const fetchImpl = async (url) => {
    if (String(url).includes('/api/user-auth/providers')) return response({ providers: { email: true } })
    dataRequest += 1
    if (dataRequest === 1) return response({ error: 'private provider text' }, 403)
    return response({ status: 'success', data: [] })
  }

  const report = await runUserAdminCertification({ environment, fetchImpl })
  assert.equal(report.overall, 'FAIL')
  assert.equal(report.checks.userSecretKeyDataAccess, 'FORBIDDEN')
  assert.equal(report.safeCodes.userKey, 'DATA_KEY_REJECTED')
  assert.doesNotMatch(JSON.stringify(report), /private provider text/)
})
