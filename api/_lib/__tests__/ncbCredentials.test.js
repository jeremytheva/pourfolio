import assert from 'node:assert/strict'
import test from 'node:test'

import {
  credentialConfigurationState,
  resolveAuthCredential,
  resolveDataCredential
} from '../ncbCredentials.js'

const originalEnvironment = {
  NOCODEBACKEND_AUTH_SECRET_KEY: process.env.NOCODEBACKEND_AUTH_SECRET_KEY,
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY
}

const configure = ({ authSecret, dataSecret } = {}) => {
  if (authSecret === undefined) delete process.env.NOCODEBACKEND_AUTH_SECRET_KEY
  else process.env.NOCODEBACKEND_AUTH_SECRET_KEY = authSecret

  if (dataSecret === undefined) delete process.env.NOCODEBACKEND_SECRET_KEY
  else process.env.NOCODEBACKEND_SECRET_KEY = dataSecret
}

test.afterEach(() => configure())
test.after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('auth and data credentials use independent server-only variables', () => {
  configure({ authSecret: 'auth-secret', dataSecret: 'data-secret' })

  assert.equal(resolveAuthCredential().value, 'auth-secret')
  assert.equal(resolveAuthCredential().source, 'nocodebackend-auth-secret-key')
  assert.equal(resolveDataCredential().value, 'data-secret')
  assert.equal(resolveDataCredential().source, 'nocodebackend-secret-key')
  assert.deepEqual(credentialConfigurationState(), {
    authCredential: 'nocodebackend-auth-secret-key',
    dataCredential: 'nocodebackend-secret-key',
    authConfigured: true,
    dataConfigured: true
  })
})

test('missing auth secret fails auth closed without affecting data access', () => {
  configure({ dataSecret: 'data-secret' })

  assert.throws(() => resolveAuthCredential(), (error) => error.code === 'AUTH_CREDENTIAL_MISSING')
  assert.equal(resolveDataCredential().value, 'data-secret')
  assert.deepEqual(credentialConfigurationState(), {
    authCredential: 'missing',
    dataCredential: 'nocodebackend-secret-key',
    authConfigured: false,
    dataConfigured: true
  })
})

test('missing data secret fails data closed without affecting auth access', () => {
  configure({ authSecret: 'auth-secret' })

  assert.equal(resolveAuthCredential().value, 'auth-secret')
  assert.throws(() => resolveDataCredential(), (error) => error.code === 'DATA_CREDENTIAL_MISSING')
  assert.deepEqual(credentialConfigurationState(), {
    authCredential: 'nocodebackend-auth-secret-key',
    dataCredential: 'missing',
    authConfigured: true,
    dataConfigured: false
  })
})
