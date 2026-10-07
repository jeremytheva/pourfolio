import assert from 'node:assert/strict'
import test from 'node:test'
import { runNoCodeBackendConnectionCertification } from './nocodebackend-connection-certification-lib.js'

const createMemoryProvider = () => {
  const tables = new Map()
  let sequence = 0

  const tableRecords = (table) => {
    if (!tables.has(table)) tables.set(table, new Map())
    return tables.get(table)
  }
  const filter = (table, filters = {}) => [...tableRecords(table).values()]
    .filter((record) => Object.entries(filters).every(([key, value]) => String(record?.[key]) === String(value)))

  return {
    isUniqueConflict(error) { return error?.code === 'UNIQUE_CONFLICT' },
    async list(table, filters = {}) { return filter(table, filters).map((record) => ({ ...record })) },
    async get(table, id) {
      const records = tableRecords(table)
      return records.has(String(id)) ? { ...records.get(String(id)) } : null
    },
    async create(table, body) {
      const records = tableRecords(table)
      if (table === 'profiles' && [...records.values()].some((record) =>
        record.user_id === body.user_id || record.public_id === body.public_id
      )) {
        const error = new Error('unique')
        error.status = 409
        error.code = 'UNIQUE_CONFLICT'
        throw error
      }
      sequence += 1
      const record = {
        id: sequence,
        ...(table === 'profiles' ? { rating_history_public: 0 } : {}),
        ...body
      }
      records.set(String(sequence), record)
      return { ...record }
    },
    async update(table, id, body) {
      const records = tableRecords(table)
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
    async remove(table, id) {
      const records = tableRecords(table)
      const key = String(id)
      if (!records.has(key)) {
        const error = new Error('missing')
        error.status = 404
        throw error
      }
      records.delete(key)
      return null
    },
    remaining() {
      return [...tables.values()].flatMap((records) => [...records.values()])
    }
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
  assert.equal(report.profile_contract.status, 'PASS')
  assert.equal(report.profile_contract.cleanup.status, 'PASS')
  assert.deepEqual(provider.remaining(), [])

  for (const result of Object.values(report.data_plane.capabilities)) assert.equal(result.status, 'PASS')
})

test('profile contract can pass independently when the generic test table fails', async () => {
  const provider = createMemoryProvider()
  const originalList = provider.list
  provider.list = async (table, filters = {}) => {
    if (table === 'chatgpt_api_test') {
      const error = new Error('generic table unavailable')
      error.status = 500
      error.code = 'PROVIDER_ERROR'
      throw error
    }
    return originalList(table, filters)
  }

  const report = await runNoCodeBackendConnectionCertification({
    provider,
    table: 'chatgpt_api_test',
    runKey: 'test-profile-independent'
  })

  assert.equal(report.overall, 'FAIL')
  assert.equal(report.data_plane.status, 'FAIL')
  assert.equal(report.data_plane.capabilities.table_read.status, 'FAIL')
  assert.equal(report.profile_contract.status, 'PASS')
  assert.equal(report.profile_contract.cleanup.status, 'PASS')
  assert.deepEqual(provider.remaining(), [])
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
