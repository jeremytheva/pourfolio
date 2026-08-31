const asArray = (value) => Array.isArray(value) ? value : value ? [value] : []
const first = (value) => asArray(value)[0] || null
const recordId = (record) => record?.id === undefined || record?.id === null ? null : String(record.id)
const ids = (records) => asArray(records).map(recordId).filter(Boolean).sort()

const errorEvidence = (error) => ({
  status: Number.isInteger(error?.status) ? error.status : null,
  code: typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR'
})

const assertCondition = (condition, code) => {
  if (!condition) {
    const error = new Error(code)
    error.code = code
    throw error
  }
}

const matchesBoolean = (value, expected) => {
  if (typeof value === 'boolean') return value === expected
  if (typeof value === 'number') return Boolean(value) === expected
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase()
    if (['true', '1'].includes(normalised)) return expected === true
    if (['false', '0'].includes(normalised)) return expected === false
  }
  return false
}

const buildRow = (runKey, suffix, overrides = {}) => ({
  run_key: runKey,
  label: `chatgpt-${suffix}`,
  quantity: suffix === 'alpha' ? 1 : 2,
  score: suffix === 'alpha' ? 1.25 : 2.5,
  active: suffix === 'alpha',
  notes: `connection-certification-${suffix}`,
  ...overrides
})

const capability = (status = 'PENDING', evidence = null) => ({ status, ...(evidence ? { evidence } : {}) })

export const DEFAULT_NOCODEBACKEND_CERTIFICATION_TABLE = 'chatgpt_api_test'

export const buildSchemaCapability = () => ({
  status: 'UNAVAILABLE_NOT_CONFIGURED',
  create_table: 'UNAVAILABLE_NOT_CONFIGURED',
  add_columns: 'UNAVAILABLE_NOT_CONFIGURED',
  drop_table: 'UNAVAILABLE_NOT_CONFIGURED',
  reason: 'No documented supported NoCodeBackend schema-management API contract is configured for this project.'
})

export const runNoCodeBackendConnectionCertification = async ({
  provider,
  table = DEFAULT_NOCODEBACKEND_CERTIFICATION_TABLE,
  runKey,
  sentinelRunKey = `${runKey}-sentinel`
}) => {
  if (!provider) throw new TypeError('provider is required')
  if (!runKey) throw new TypeError('runKey is required')
  if (!/^[a-z][a-z0-9_]*$/i.test(table)) throw new TypeError('table must be a simple NoCodeBackend table identifier')

  const report = {
    version: 1,
    provider: 'NoCodeBackend',
    table,
    run_key: runKey,
    overall: 'PENDING',
    data_plane: {
      status: 'PENDING',
      capabilities: {
        table_read: capability(),
        create: capability(),
        filtered_list: capability(),
        read_one: capability(),
        update: capability(),
        delete: capability(),
        post_delete_read: capability(),
        final_empty_scope: capability()
      }
    },
    schema_plane: buildSchemaCapability(),
    cleanup: { status: 'PENDING', attempted: 0, removed: 0, residual: 0, failures: [] }
  }

  const created = new Map()
  const capabilityEntries = report.data_plane.capabilities
  let primaryFailure = null

  const failCapability = (name, error) => {
    capabilityEntries[name] = capability('FAIL', errorEvidence(error))
    primaryFailure ||= { capability: name, ...errorEvidence(error) }
  }

  const passCapability = (name, evidence) => {
    capabilityEntries[name] = capability('PASS', evidence)
  }

  const remember = (record, rowRunKey) => {
    const id = recordId(record)
    assertCondition(id, 'CREATE_ID_MISSING')
    created.set(id, rowRunKey)
    return record
  }

  const cleanup = async () => {
    if (report.setup_required?.code === 'TEST_TABLE_MISSING' && created.size === 0) {
      report.cleanup.status = 'NOT_APPLICABLE'
      return
    }

    report.cleanup.attempted = created.size

    for (const [id] of [...created.entries()].reverse()) {
      try {
        await provider.remove(table, id)
        created.delete(id)
        report.cleanup.removed += 1
      } catch (error) {
        report.cleanup.failures.push({ id: '<redacted-record-id>', ...errorEvidence(error) })
      }
    }

    for (const scope of [runKey, sentinelRunKey]) {
      try {
        const scoped = await provider.list(table, { run_key: scope })
        for (const record of scoped) {
          if (String(record?.run_key) !== scope) continue
          const id = recordId(record)
          if (!id) continue
          try {
            await provider.remove(table, id)
            report.cleanup.removed += 1
          } catch (error) {
            report.cleanup.failures.push({ id: '<redacted-record-id>', ...errorEvidence(error) })
          }
        }
      } catch (error) {
        report.cleanup.failures.push({ scope: '<redacted-run-scope>', ...errorEvidence(error) })
      }
    }

    let residual = 0
    for (const scope of [runKey, sentinelRunKey]) {
      try {
        const scoped = await provider.list(table, { run_key: scope })
        residual += scoped.filter((record) => String(record?.run_key) === scope).length
      } catch (error) {
        report.cleanup.failures.push({ verification: 'scope-read', ...errorEvidence(error) })
      }
    }

    report.cleanup.residual = residual
    report.cleanup.status = report.cleanup.failures.length || residual ? 'FAIL' : 'PASS'
  }

  try {
    try {
      const initial = await provider.list(table, { run_key: runKey })
      assertCondition(initial.every((record) => String(record?.run_key) === runKey), 'FILTER_SCOPE_BROKEN')
      passCapability('table_read', { records: initial.length })
    } catch (error) {
      failCapability('table_read', error)
      if (error?.status === 404) {
        report.overall = 'SETUP_REQUIRED'
        report.data_plane.status = 'SETUP_REQUIRED'
        report.setup_required = {
          code: 'TEST_TABLE_MISSING',
          table,
          required_columns: ['run_key', 'label', 'quantity', 'score', 'active', 'notes']
        }
        return report
      }
      throw error
    }

    let alpha
    let beta
    let sentinel
    try {
      alpha = remember(first(await provider.create(table, buildRow(runKey, 'alpha'))), runKey)
      beta = remember(first(await provider.create(table, buildRow(runKey, 'beta'))), runKey)
      sentinel = remember(first(await provider.create(table, buildRow(sentinelRunKey, 'sentinel', {
        quantity: 99,
        score: 9.9,
        active: true,
        notes: 'filter-sentinel'
      }))), sentinelRunKey)
      passCapability('create', { records_created: 3 })
    } catch (error) {
      failCapability('create', error)
      throw error
    }

    try {
      const currentScope = await provider.list(table, { run_key: runKey })
      const expected = [recordId(alpha), recordId(beta)].sort()
      assertCondition(currentScope.every((record) => String(record?.run_key) === runKey), 'FILTER_SCOPE_BROKEN')
      assertCondition(JSON.stringify(ids(currentScope)) === JSON.stringify(expected), 'FILTER_RESULT_MISMATCH')
      const sentinelScope = await provider.list(table, { run_key: sentinelRunKey })
      assertCondition(JSON.stringify(ids(sentinelScope)) === JSON.stringify([recordId(sentinel)]), 'FILTER_SENTINEL_MISMATCH')
      passCapability('filtered_list', { scoped_records: currentScope.length, sentinel_records: sentinelScope.length })
    } catch (error) {
      failCapability('filtered_list', error)
      throw error
    }

    try {
      const fetched = await provider.get(table, alpha.id)
      assertCondition(recordId(fetched) === recordId(alpha), 'READ_ID_MISMATCH')
      assertCondition(String(fetched?.label) === 'chatgpt-alpha', 'READ_VALUE_MISMATCH')
      assertCondition(Number(fetched?.quantity) === 1, 'READ_NUMERIC_VALUE_MISMATCH')
      assertCondition(matchesBoolean(fetched?.active, true), 'READ_BOOLEAN_VALUE_MISMATCH')
      passCapability('read_one', { matched: true })
    } catch (error) {
      failCapability('read_one', error)
      throw error
    }

    try {
      const updated = first(await provider.update(table, alpha.id, {
        label: 'chatgpt-alpha-updated',
        quantity: 11,
        score: 9.75,
        active: false,
        notes: 'connection-certification-updated'
      }))
      assertCondition(recordId(updated) === recordId(alpha), 'UPDATE_ID_MISMATCH')
      const fetched = await provider.get(table, alpha.id)
      assertCondition(String(fetched?.label) === 'chatgpt-alpha-updated', 'UPDATE_TEXT_MISMATCH')
      assertCondition(Number(fetched?.quantity) === 11, 'UPDATE_INTEGER_MISMATCH')
      assertCondition(Number(fetched?.score) === 9.75, 'UPDATE_FLOAT_MISMATCH')
      assertCondition(matchesBoolean(fetched?.active, false), 'UPDATE_BOOLEAN_MISMATCH')
      passCapability('update', { matched: true })
    } catch (error) {
      failCapability('update', error)
      throw error
    }

    try {
      await provider.remove(table, beta.id)
      created.delete(recordId(beta))
      passCapability('delete', { records_deleted: 1 })
    } catch (error) {
      failCapability('delete', error)
      throw error
    }

    try {
      const missing = await provider.get(table, beta.id)
      assertCondition(missing === null, 'DELETED_RECORD_REMAINS')
      passCapability('post_delete_read', { deleted_record_absent: true })
    } catch (error) {
      failCapability('post_delete_read', error)
      throw error
    }

    try {
      await provider.remove(table, alpha.id)
      created.delete(recordId(alpha))
      await provider.remove(table, sentinel.id)
      created.delete(recordId(sentinel))
      const currentScope = await provider.list(table, { run_key: runKey })
      const sentinelScope = await provider.list(table, { run_key: sentinelRunKey })
      assertCondition(currentScope.filter((record) => String(record?.run_key) === runKey).length === 0, 'RUN_SCOPE_NOT_EMPTY')
      assertCondition(sentinelScope.filter((record) => String(record?.run_key) === sentinelRunKey).length === 0, 'SENTINEL_SCOPE_NOT_EMPTY')
      passCapability('final_empty_scope', { current_records: 0, sentinel_records: 0 })
    } catch (error) {
      failCapability('final_empty_scope', error)
      throw error
    }
  } catch {
    // Failure detail is already recorded in the capability matrix. Cleanup below is authoritative.
  } finally {
    await cleanup()
  }

  if (report.overall === 'SETUP_REQUIRED') return report

  const capabilityFailed = Object.values(capabilityEntries).some((entry) => entry.status === 'FAIL')
  const capabilityPending = Object.values(capabilityEntries).some((entry) => entry.status === 'PENDING')
  report.data_plane.status = capabilityFailed || capabilityPending ? 'FAIL' : 'PASS'
  report.overall = report.data_plane.status === 'PASS' && report.cleanup.status === 'PASS' ? 'PASS' : 'FAIL'
  if (primaryFailure) report.failure = primaryFailure
  return report
}
