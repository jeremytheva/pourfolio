import assert from 'node:assert/strict'
import test from 'node:test'

import { runProfileProviderCertification } from '../profile-provider-certification-lib.js'

const existingProfile = {
  id: 7,
  user_id: 'user-1',
  public_id: 'profile_abcdefgh1234',
  name: 'Existing User',
  description: '',
  avatar_url: null,
  rating_history_public: 0
}

const createProvider = (rows = [existingProfile]) => ({
  async list(_table, filters = {}) {
    return rows.filter((record) =>
      Object.entries(filters).every(([key, value]) => String(record?.[key] ?? '') === String(value))
    ).map((record) => ({ ...record }))
  }
})

test('profile provider certification verifies existing provider shape and exact filters without mutation', async () => {
  const report = await runProfileProviderCertification({ provider: createProvider() })

  assert.equal(report.status, 'PARTIAL')
  assert.equal(report.capabilities.table_read.status, 'PASS')
  assert.equal(report.capabilities.required_field_shape.status, 'PASS')
  assert.equal(report.capabilities.owner_filter.status, 'PASS')
  assert.equal(report.capabilities.public_id_filter.status, 'PASS')
  assert.equal(report.capabilities.privacy_field.status, 'PASS')
  assert.equal(report.capabilities.create.status, 'BLOCKED')
  assert.equal(report.capabilities.update.status, 'BLOCKED')
  assert.equal(report.capabilities.unique_user_id.status, 'BLOCKED')
  assert.equal(report.capabilities.unique_public_id.status, 'BLOCKED')
  assert.equal(report.cleanup.status, 'NOT_APPLICABLE')
})

test('profile provider certification fails closed when existing rows violate the required field shape', async () => {
  const report = await runProfileProviderCertification({
    provider: createProvider([{ ...existingProfile, public_id: null }])
  })

  assert.equal(report.status, 'FAIL')
  assert.equal(report.capabilities.required_field_shape.status, 'FAIL')
})

test('profile provider certification reports an empty deployed table as partial evidence', async () => {
  const report = await runProfileProviderCertification({ provider: createProvider([]) })

  assert.equal(report.status, 'PARTIAL')
  assert.equal(report.capabilities.table_read.status, 'PASS')
  assert.equal(report.capabilities.required_field_shape.status, 'BLOCKED')
})
