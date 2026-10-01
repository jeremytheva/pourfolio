import assert from 'node:assert/strict'
import test from 'node:test'

import {
  certificationCredentialConfigurationState,
  requireUserAdminCertificationCredentials
} from '../userAdminCertificationCredentials.js'

const configured = {
  NOCODEBACKEND_USER_EMAIL: 'user@example.test',
  NOCODEBACKEND_USER_SECRET_KEY: 'user-secret',
  NOCODEBACKEND_ADMIN_EMAIL: 'admin@example.test',
  NOCODEBACKEND_ADMIN_SECRET_KEY: 'admin-secret'
}

test('configuration state exposes only booleans and distinction checks', () => {
  const state = certificationCredentialConfigurationState(configured)
  assert.deepEqual(state, {
    user: { emailConfigured: true, secretKeyConfigured: true, configured: true },
    admin: { emailConfigured: true, secretKeyConfigured: true, configured: true },
    emailsDistinct: true,
    secretKeysDistinct: true
  })

  const serialized = JSON.stringify(state)
  assert.doesNotMatch(serialized, /user@example|admin@example|user-secret|admin-secret/)
})

test('missing values fail closed with variable names only', () => {
  assert.throws(
    () => requireUserAdminCertificationCredentials({
      NOCODEBACKEND_USER_EMAIL: configured.NOCODEBACKEND_USER_EMAIL
    }),
    (error) => {
      assert.equal(error.code, 'CERTIFICATION_CREDENTIALS_MISSING')
      assert.deepEqual(error.missing.sort(), [
        'NOCODEBACKEND_ADMIN_EMAIL',
        'NOCODEBACKEND_ADMIN_SECRET_KEY',
        'NOCODEBACKEND_USER_SECRET_KEY'
      ].sort())
      return true
    }
  )
})

test('user and admin identities and keys must be distinct', () => {
  assert.throws(
    () => requireUserAdminCertificationCredentials({
      ...configured,
      NOCODEBACKEND_ADMIN_EMAIL: 'USER@example.test'
    }),
    { code: 'CERTIFICATION_IDENTITIES_NOT_DISTINCT' }
  )

  assert.throws(
    () => requireUserAdminCertificationCredentials({
      ...configured,
      NOCODEBACKEND_ADMIN_SECRET_KEY: configured.NOCODEBACKEND_USER_SECRET_KEY
    }),
    { code: 'CERTIFICATION_SECRET_KEYS_NOT_DISTINCT' }
  )
})
