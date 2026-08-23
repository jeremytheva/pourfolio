import assert from 'node:assert/strict'
import test from 'node:test'

import {
  credentialConfigurationState,
  resolveAuthCredential,
  resolveDataCredential
} from '../ncbCredentials.js'

const configure = (value) => {
  if (value === undefined) delete process.env.NOCODEBACKEND_SECRET_KEY
  else process.env.NOCODEBACKEND_SECRET_KEY = value
}

test.afterEach(() => configure())

test('NOCODEBACKEND_SECRET_KEY is shared by auth and data access', () => {
  configure('shared-secret')
  assert.equal(resolveAuthCredential().value, 'shared-secret')
  assert.equal(resolveDataCredential().value, 'shared-secret')
  assert.deepEqual(credentialConfigurationState(), {
    authCredential: 'nocodebackend-secret-key',
    dataCredential: 'nocodebackend-secret-key',
    authConfigured: true,
    dataConfigured: true
  })
})

test('missing NOCODEBACKEND_SECRET_KEY fails auth and data closed', () => {
  configure()
  assert.throws(() => resolveAuthCredential(), (error) => error.code === 'AUTH_CREDENTIAL_MISSING')
  assert.throws(() => resolveDataCredential(), (error) => error.code === 'DATA_CREDENTIAL_MISSING')
  assert.deepEqual(credentialConfigurationState(), {
    authCredential: 'missing',
    dataCredential: 'missing',
    authConfigured: false,
    dataConfigured: false
  })
})
