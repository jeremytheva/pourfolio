import assert from 'node:assert/strict'
import test from 'node:test'

import {
  credentialConfigurationState,
  resolveAuthCredential,
  resolveDataCredential
} from '../ncbCredentials.js'

const variables = [
  'NCB_SECRET_KEY',
  'NCB_API_KEY',
  'NOCODEBACKEND_API_KEY',
  'NOCODEBACKEND_SECRET_KEY'
]

const configure = (values = {}) => {
  for (const key of variables) {
    if (Object.hasOwn(values, key)) process.env[key] = values[key]
    else delete process.env[key]
  }
}

test.afterEach(() => configure())

test('legacy auth secret remains valid for auth but not generated-table data', () => {
  configure({ NOCODEBACKEND_SECRET_KEY: 'auth-secret' })
  assert.equal(resolveAuthCredential().value, 'auth-secret')
  assert.throws(() => resolveDataCredential(), (error) => error.code === 'DATA_CREDENTIAL_MISSING')
  assert.deepEqual(credentialConfigurationState(), {
    authCredential: 'nocodebackend-secret-key',
    dataCredential: 'missing',
    authConfigured: true,
    dataConfigured: false
  })
})

test('NCB_SECRET_KEY is shared by auth and generated-table data', () => {
  configure({ NCB_SECRET_KEY: 'shared-secret' })
  assert.equal(resolveAuthCredential().value, 'shared-secret')
  assert.equal(resolveDataCredential().value, 'shared-secret')
  assert.equal(credentialConfigurationState().dataCredential, 'ncb-secret-key')
})

test('generated-table data supports documented API key aliases', () => {
  configure({ NCB_API_KEY: 'data-key' })
  assert.equal(resolveDataCredential().value, 'data-key')
  assert.equal(credentialConfigurationState().dataCredential, 'ncb-api-key')

  configure({ NOCODEBACKEND_API_KEY: 'legacy-data-key' })
  assert.equal(resolveDataCredential().value, 'legacy-data-key')
  assert.equal(credentialConfigurationState().dataCredential, 'nocodebackend-api-key')
})
