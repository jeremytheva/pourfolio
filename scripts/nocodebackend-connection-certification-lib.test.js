import assert from 'node:assert/strict'
import test from 'node:test'
import { runNoCodeBackendConnectionCertification } from './nocodebackend-connection-certification-lib.js'

const createMemoryProvider = () => {
  const records = new Map()
  let sequence = 0

  const filter = (filters = {}) => [...records.values()].filter((record) => Object.entries(filters).every(([key, value]) => String(record?.[key]) === String(value)))

  return {
    async list(_table, filters = {}) { return filter(filters).map((record) => ({ ...record })) },
    async get(_table, id) { return records.has(String(id)) ? { ...records.get(String(id)) } : null },
    async create(_table, body) {
      sequence += 1
      const record = { id: sequence, ...body }
      records.set(String(sequence), record)
      return { ...record }
    },
    async update(_table, id, body) {
      const key = String(id)
      if (!records.has(key)) {
        const error = new Error('missing')
        error.status = 404
        throw error
      }
      const record = { ...records.get(key), ...body }
      records.set(key, record)
      return { ...record }
    },
    async remove(_table, id) {
      const key = String(id)
      if (!records.has(key)) {
        const error = new Error('missing')
        error.status = 404
        throw error
      }
      records.delete(key)
      return null
    },
    remaining() { return [...records.values()] }
  }
}

test('certifies isolated create/read/update/delete behaviour and leaves no rows', async () => {
  const provider = createMemoryProvider()
  const report = await runNoCodeBackendConnectionCertification({
    provider,
    table: 'chatgpt_api_test',
    runKey: 'test-run-1'
  })

  assert.equal(report.overall, 'PASS')
  assert.equal(report.data_plane.status, 'PASS')
  assert.equal(report.cleanup.status, 'PASS')
  assert.equal(report.schema_plane.status, 'UNAVAILABLE_NOT_CONFIGURED')
  assert.deepEqual(provider.remaining(), [])

  for (const result of Object.values(report.data_plane.capabilities)) assert.equal(result.status, 'PASS')
})

test('reports missing dedicated test table as setup required without false cleanup failure', async () => {
  const provider = {
    async list() {
      const error = new Error('missing')
      error.status = 404
      error.code = 'PROVIDER_ERROR'
      throw error
    },
    async get() { return null },
    async create() { throw new Error('not reached') },
    async update() { throw new Error('not reached') },
    async remove() { throw new Error('not reached') }
  }

  const report = await runNoCodeBackendConnectionCertification({
    provider,
    table: 'chatgpt_api_test',
    runKey: 'test-run-missing'
  })

  assert.equal(report.overall, 'SETUP_REQUIRED')
  assert.equal(report.data_plane.status, 'SETUP_REQUIRED')
  assert.equal(report.cleanup.status, 'NOT_APPLICABLE')
  assert.equal(report.setup_required.code, 'TEST_TABLE_MISSING')
  assert.deepEqual(report.setup_required.required_columns, ['run_key', 'label', 'quantity', 'score', 'active', 'notes'])
})

test('fails when filtered reads leak a sentinel scope and still cleans up', async () => {
  const provider = createMemoryProvider()
  const originalList = provider.list
  provider.list = async (table, filters) => {
    const rows = await originalList(table, {})
    if (Object.keys(filters || {}).length === 0) return rows
    return rows
  }

  const report = await runNoCodeBackendConnectionCertification({
    provider,
    table: 'chatgpt_api_test',
    runKey: 'test-run-filter'
  })

  assert.equal(report.overall, 'FAIL')
  assert.equal(report.data_plane.capabilities.filtered_list.status, 'FAIL')
  assert.equal(report.cleanup.status, 'PASS')
  assert.deepEqual(provider.remaining(), [])
})
