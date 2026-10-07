const asArray = (value) => Array.isArray(value) ? value : value ? [value] : []
const first = (value) => asArray(value)[0] || null
const recordId = (record) => record?.id === undefined || record?.id === null ? null : String(record.id)
const booleanValue = (value) => value === true || value === 1 || value === '1'

const evidenceError = (error) => ({
  status: Number.isInteger(error?.status) ? error.status : null,
  code: typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR'
})

const requireCondition = (condition, code) => {
  if (!condition) {
    const error = new Error(code)
    error.code = code
    throw error
  }
}

const capability = (status = 'PENDING', evidence = null) => ({
  status,
  ...(evidence ? { evidence } : {})
})

export const runProfileProviderCertification = async ({
  provider,
  runKey,
  table = 'profiles'
}) => {
  if (!provider) throw new TypeError('provider is required')
  if (!runKey) throw new TypeError('runKey is required')

  const suffix = String(runKey).replace(/[^a-z0-9]/gi, '').slice(-20) || 'certification'
  const userId = ('pf-cert-' + suffix).slice(0, 36)
  const alternateUserId = ('pf-alt-' + suffix).slice(0, 36)
  const publicId = 'pf_cert_' + suffix
  const alternatePublicId = 'pf_alt_' + suffix

  const report = {
    status: 'PENDING',
    table,
    capabilities: {
      create_default_private: capability(),
      owner_filter: capability(),
      public_id_filter: capability(),
      update: capability(),
      unique_user_id: capability(),
      unique_public_id: capability(),
      cleanup: capability()
    },
    cleanup: { attempted: 0, removed: 0, residual: 0, failures: [] }
  }

  const created = new Set()
  let primaryFailure = null
  const fail = (name, error) => {
    report.capabilities[name] = capability('FAIL', evidenceError(error))
    primaryFailure ||= { capability: name, ...evidenceError(error) }
  }
  const pass = (name, evidence) => {
    report.capabilities[name] = capability('PASS', evidence)
  }
  const remember = (record) => {
    const id = recordId(record)
    requireCondition(id, 'PROFILE_CREATE_ID_MISSING')
    created.add(id)
    return record
  }

  const cleanup = async () => {
    report.cleanup.attempted = created.size
    for (const id of [...created].reverse()) {
      try {
        await provider.remove(table, id)
        created.delete(id)
        report.cleanup.removed += 1
      } catch (error) {
        report.cleanup.failures.push({ id: '<redacted-record-id>', ...evidenceError(error) })
      }
    }

    try {
      const residualRows = [
        ...asArray(await provider.list(table, { user_id: userId })),
        ...asArray(await provider.list(table, { user_id: alternateUserId })),
        ...asArray(await provider.list(table, { public_id: publicId })),
        ...asArray(await provider.list(table, { public_id: alternatePublicId }))
      ]
      const residualIds = new Set(residualRows.map(recordId).filter(Boolean))
      report.cleanup.residual = residualIds.size
    } catch (error) {
      report.cleanup.failures.push({ verification: 'profile-scope-read', ...evidenceError(error) })
    }

    const ok = report.cleanup.failures.length === 0 && report.cleanup.residual === 0
    report.cleanup.status = ok ? 'PASS' : 'FAIL'
    report.capabilities.cleanup = capability(ok ? 'PASS' : 'FAIL', {
      removed: report.cleanup.removed,
      residual: report.cleanup.residual
    })
  }

  try {
    let createdProfile
    try {
      createdProfile = remember(first(await provider.create(table, {
        user_id: userId,
        public_id: publicId,
        name: 'Pourfolio profile certification'
      })))
      const fetched = await provider.get(table, createdProfile.id)
      requireCondition(String(fetched?.user_id ?? '') === userId, 'PROFILE_OWNER_DEFAULT_MISMATCH')
      requireCondition(String(fetched?.public_id ?? '') === publicId, 'PROFILE_PUBLIC_ID_DEFAULT_MISMATCH')
      requireCondition(booleanValue(fetched?.rating_history_public) === false, 'PROFILE_DEFAULT_PRIVATE_MISMATCH')
      pass('create_default_private', { default_private: true })
    } catch (error) {
      fail('create_default_private', error)
      throw error
    }

    try {
      const owned = asArray(await provider.list(table, { user_id: userId }))
        .filter((row) => String(row?.user_id ?? '') === userId)
      requireCondition(owned.length === 1, 'PROFILE_OWNER_FILTER_MISMATCH')
      requireCondition(recordId(owned[0]) === recordId(createdProfile), 'PROFILE_OWNER_FILTER_ID_MISMATCH')
      pass('owner_filter', { records: owned.length })
    } catch (error) {
      fail('owner_filter', error)
      throw error
    }

    try {
      const publicRows = asArray(await provider.list(table, { public_id: publicId }))
        .filter((row) => String(row?.public_id ?? '') === publicId)
      requireCondition(publicRows.length === 1, 'PROFILE_PUBLIC_FILTER_MISMATCH')
      requireCondition(recordId(publicRows[0]) === recordId(createdProfile), 'PROFILE_PUBLIC_FILTER_ID_MISMATCH')
      pass('public_id_filter', { records: publicRows.length })
    } catch (error) {
      fail('public_id_filter', error)
      throw error
    }

    try {
      await provider.update(table, createdProfile.id, {
        name: 'Pourfolio profile certification updated',
        description: 'Temporary provider certification row.',
        rating_history_public: 1
      })
      const updated = await provider.get(table, createdProfile.id)
      requireCondition(String(updated?.name ?? '') === 'Pourfolio profile certification updated', 'PROFILE_UPDATE_NAME_MISMATCH')
      requireCondition(String(updated?.description ?? '') === 'Temporary provider certification row.', 'PROFILE_UPDATE_DESCRIPTION_MISMATCH')
      requireCondition(booleanValue(updated?.rating_history_public) === true, 'PROFILE_UPDATE_VISIBILITY_MISMATCH')
      requireCondition(String(updated?.user_id ?? '') === userId, 'PROFILE_UPDATE_OWNER_DRIFT')
      requireCondition(String(updated?.public_id ?? '') === publicId, 'PROFILE_UPDATE_PUBLIC_ID_DRIFT')
      pass('update', { matched: true })
    } catch (error) {
      fail('update', error)
      throw error
    }

    try {
      let conflict = null
      try {
        const duplicate = first(await provider.create(table, {
          user_id: userId,
          public_id: alternatePublicId,
          name: 'Duplicate owner profile certification'
        }))
        if (duplicate) remember(duplicate)
      } catch (error) {
        conflict = error
      }
      requireCondition(conflict && provider.isUniqueConflict?.(conflict), 'PROFILE_USER_ID_UNIQUENESS_MISSING')
      pass('unique_user_id', { rejected_duplicate: true })
    } catch (error) {
      fail('unique_user_id', error)
      throw error
    }

    try {
      let conflict = null
      try {
        const duplicate = first(await provider.create(table, {
          user_id: alternateUserId,
          public_id: publicId,
          name: 'Duplicate public profile certification'
        }))
        if (duplicate) remember(duplicate)
      } catch (error) {
        conflict = error
      }
      requireCondition(conflict && provider.isUniqueConflict?.(conflict), 'PROFILE_PUBLIC_ID_UNIQUENESS_MISSING')
      pass('unique_public_id', { rejected_duplicate: true })
    } catch (error) {
      fail('unique_public_id', error)
      throw error
    }
  } catch {
    // Capability failure is recorded above; cleanup remains authoritative.
  } finally {
    await cleanup()
  }

  const failed = Object.values(report.capabilities).some((entry) => entry.status === 'FAIL')
  const pending = Object.values(report.capabilities).some((entry) => entry.status === 'PENDING')
  report.status = failed || pending ? 'FAIL' : 'PASS'
  if (primaryFailure) report.failure = primaryFailure
  return report
}
