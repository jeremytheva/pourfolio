const asArray = (value) => Array.isArray(value) ? value : value ? [value] : []
const recordId = (record) => record?.id === undefined || record?.id === null ? null : String(record.id)
const privacyValue = (value) => [true, false, 1, 0, '1', '0'].includes(value)

const capability = (status = 'NOT_RUN', evidence = null) => ({
  status,
  ...(evidence ? { evidence } : {})
})

const errorEvidence = (error) => ({
  status: Number.isInteger(error?.status) ? error.status : null,
  code: typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR'
})

export const runProfileProviderCertification = async ({
  provider,
  table = 'profiles'
}) => {
  if (!provider) throw new TypeError('provider is required')

  const report = {
    status: 'PENDING',
    table,
    capabilities: {
      table_read: capability(),
      required_field_shape: capability(),
      owner_filter: capability(),
      public_id_filter: capability(),
      privacy_field: capability(),
      create: capability('BLOCKED', { reason: 'valid_authenticated_test_subject_required' }),
      update: capability('BLOCKED', { reason: 'cleanup_guarded_authenticated_profile_required' }),
      unique_user_id: capability('BLOCKED', { reason: 'valid_authenticated_test_subject_required' }),
      unique_public_id: capability('BLOCKED', { reason: 'second_valid_authenticated_test_subject_required' }),
      cleanup: capability('NOT_APPLICABLE', { mutation_attempted: false, residual: 0 })
    },
    cleanup: {
      status: 'NOT_APPLICABLE',
      attempted: 0,
      removed: 0,
      residual: 0,
      failures: []
    }
  }

  try {
    const rows = asArray(await provider.list(table, {}))
    report.capabilities.table_read = capability('PASS', { records_observed: rows.length })

    if (rows.length === 0) {
      report.capabilities.required_field_shape = capability('BLOCKED', { reason: 'no_existing_profile_fixture' })
      report.capabilities.owner_filter = capability('BLOCKED', { reason: 'no_existing_profile_fixture' })
      report.capabilities.public_id_filter = capability('BLOCKED', { reason: 'no_existing_profile_fixture' })
      report.capabilities.privacy_field = capability('BLOCKED', { reason: 'no_existing_profile_fixture' })
      report.status = 'PARTIAL'
      return report
    }

    const candidate = rows.find((record) =>
      recordId(record) &&
      String(record?.user_id ?? '').trim() &&
      String(record?.public_id ?? '').trim() &&
      String(record?.name ?? '').trim() &&
      privacyValue(record?.rating_history_public)
    )

    if (!candidate) {
      report.capabilities.required_field_shape = capability('FAIL', { reason: 'no_valid_existing_profile_shape' })
      report.status = 'FAIL'
      return report
    }

    report.capabilities.required_field_shape = capability('PASS', {
      fields_present: ['id', 'user_id', 'public_id', 'name', 'rating_history_public']
    })
    report.capabilities.privacy_field = capability('PASS', { present_and_boolean_like: true })

    const owned = asArray(await provider.list(table, { user_id: candidate.user_id }))
      .filter((record) => String(record?.user_id ?? '') === String(candidate.user_id))
    if (owned.length === 1 && recordId(owned[0]) === recordId(candidate)) {
      report.capabilities.owner_filter = capability('PASS', { exact_records: 1 })
    } else {
      report.capabilities.owner_filter = capability('FAIL', { exact_records: owned.length })
    }

    const publicRows = asArray(await provider.list(table, { public_id: candidate.public_id }))
      .filter((record) => String(record?.public_id ?? '') === String(candidate.public_id))
    if (publicRows.length === 1 && recordId(publicRows[0]) === recordId(candidate)) {
      report.capabilities.public_id_filter = capability('PASS', { exact_records: 1 })
    } else {
      report.capabilities.public_id_filter = capability('FAIL', { exact_records: publicRows.length })
    }

    const failed = ['required_field_shape', 'owner_filter', 'public_id_filter', 'privacy_field']
      .some((name) => report.capabilities[name].status === 'FAIL')
    report.status = failed ? 'FAIL' : 'PARTIAL'
  } catch (error) {
    report.status = 'FAIL'
    report.failure = { capability: 'table_read', ...errorEvidence(error) }
    report.capabilities.table_read = capability('FAIL', errorEvidence(error))
  }

  return report
}
