import assert from 'node:assert/strict'
import test from 'node:test'

import { runProfileProviderCertification } from '../profile-provider-certification-lib.js'

const createProvider = () => {
  const records = new Map()
  let sequence = 0

  const list = (filters = {}) => [...records.values()]
    .filter((record) => Object.entries(filters).every(([key, value]) => String(record?.[key] ?? '') === String(value)))
    .map((record) => ({ ...record }))

  return {
    isUniqueConflict(error) { return error?.code === 'UNIQUE_CONFLICT' },
    async list(_table, filters = {}) { return list(filters) },
    async get(_table, id) { return records.has(String(id)) ? { ...records.get(String(id)) } : null },
    async create(_table, body) {
      if ([...records.values()].some((record) => record.user_id === body.user_id || record.public_id === body.public_id)) {
        const error = new Error('unique')
        error.status = 409
        error.code = 'UNIQUE_CONFLICT'
        throw error
      }
      sequence += 1
      const record = { id: sequence, rating_history_public: 0, ...body }
      records.set(String(sequence), record)
      return { ...record }
    },
    async update(_table, id, body) {
      const current = records.get(String(id))
      if (!current) throw Object.assign(new Error('missing'), { status: 404, code: 'PROVIDER_ERROR' })
      const next = { ...current, ...body }
      records.set(String(id), next)
      return { ...next }
    },
    async remove(_table, id) {
      if (!records.delete(String(id))) throw Object.assign(new Error('missing'), { status: 404, code: 'PROVIDER_ERROR' })
      return null
    },
    remaining() { return [...records.values()] }
  }
}

test('profile provider certification proves defaults, uniqueness, update and cleanup', async () => {
  const provider = createProvider()
  const report = await runProfileProviderCertification({ provider, runKey: 'test-profile-1' })

  assert.equal(report.status, 'PASS')
  assert.equal(report.cleanup.status, 'PASS')
  assert.equal(report.cleanup.residual, 0)
  assert.deepEqual(provider.remaining(), [])
  for (const result of Object.values(report.capabilities)) assert.equal(result.status, 'PASS')
})

test('profile provider certification fails when provider uniqueness is not enforced and still cleans up', async () => {
  const provider = createProvider()
  provider.isUniqueConflict = () => false
  const originalCreate = provider.create
  provider.create = async (_table, body) => {
    // Deliberately bypass the memory provider uniqueness rule for this negative test.
    const existing = provider.remaining()
    if (existing.some((record) => record.user_id === body.user_id || record.public_id === body.public_id)) {
      const clone = { id: 100 + existing.length, rating_history_public: 0, ...body }
      const records = existing.map((record) => ({ ...record }))
      const fake = createProvider()
      for (const record of records) await fake.create('profiles', record)
      return clone
    }
    return originalCreate(_table, body)
  }

  const report = await runProfileProviderCertification({ provider, runKey: 'test-profile-2' })
  assert.equal(report.status, 'FAIL')
  assert.equal(report.capabilities.unique_user_id.status, 'FAIL')
})
