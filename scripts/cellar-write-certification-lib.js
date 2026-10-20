import { dataProvider } from '../api/_lib/dataProvider.js'
import { routeCellarRequest, verifyPersistedCellar } from '../api/cellar-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { readAllBonusCertificationRows } from './bonus-write-certification-lib.js'

const CELLAR = COLLECTIONS.cellar
const idOf = (value) => ['number', 'string'].includes(typeof value) &&
  (typeof value !== 'number' || Number.isSafeInteger(value)) && /^[1-9]\d*$/.test(String(value))
  ? String(value) : null
const same = (left, right) => String(left ?? '') === String(right ?? '')
const requireThat = (condition, code) => {
  if (!condition) throw Object.assign(new Error(code), { code })
}
const safeCode = (error) => /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code || '')
  ? error.code : 'CELLAR_CERTIFICATION_FAILED'
const fingerprint = (row) => JSON.stringify(Object.entries(row || {}).sort(([a], [b]) => a.localeCompare(b)))

export const cellarCertificationScope = (environment) => {
  const scope = environment.CELLAR_CERTIFICATION_SCOPE || 'owner-and-isolation'
  const confirmation = scope === 'owner-crud-only'
    ? 'RUN CURRENT INSTANCE OWNER CELLAR TEST' : 'RUN CURRENT INSTANCE CELLAR TEST'
  requireThat(['owner-crud-only', 'owner-and-isolation'].includes(scope) &&
    environment.CELLAR_CERTIFICATION_CONFIRMATION === confirmation &&
    /^[a-f0-9]{40}$/.test(environment.CELLAR_CERTIFICATION_SHA || ''), 'CELLAR_EXECUTION_GUARD_MISSING')
  requireThat(scope === 'owner-crud-only' || Boolean(environment.RELEASE_OTHER_EMAIL?.trim()) &&
    Boolean(environment.RELEASE_OTHER_PASSWORD?.trim()), 'CELLAR_SECOND_ACCOUNT_CONFIGURATION_INCOMPLETE')
  return scope
}

export const inspectCellarCreateAttempt = async ({ provider, freshProvider, userId, receipt, summary, sourceSha }) => {
  requireThat(/^[a-f0-9]{40}$/.test(sourceSha || '') && summary?.candidateCommit === sourceSha &&
    summary.createsAttempted === 1 && summary.updatesAttempted === 0 && summary.deletesAttempted === 0 &&
    receipt?.version === 1 && receipt.kind === 'cellar-create-checkpoint' && receipt.candidateCommit === sourceSha &&
    receipt.stage === 'create-intent' && receipt.createdId === null && receipt.createsAttempted === 0 &&
    receipt.userId === userId && /^cellar-[a-f0-9-]{36}$/.test(receipt.runKey || '') &&
    receipt.marker === `Pourfolio release QA ${receipt.runKey}` && idOf(receipt.productId) &&
    Array.isArray(receipt.baselineIds) && receipt.baselineIds.every(idOf) &&
    new Set(receipt.baselineIds.map(String)).size === receipt.baselineIds.length,
  'CELLAR_INSPECTION_SOURCE_UNCONFIRMED')
  const [normal, fresh, scoped] = await Promise.all([
    readAllBonusCertificationRows(provider, CELLAR),
    readAllBonusCertificationRows(freshProvider, CELLAR),
    readAllBonusCertificationRows({ listPage: (collection, options) =>
      freshProvider.listPage(collection, { ...options, filters: { notes: receipt.marker } }) }, CELLAR)
  ])
  const select = (rows) => rows.filter((row) => row.notes === receipt.marker)
  const normalMatches = select(normal), freshMatches = select(fresh), scopedMatches = select(scoped)
  const baseline = new Set(receipt.baselineIds.map(String))
  const newRows = fresh.filter((row) => !baseline.has(String(row.id)))
  const report = { version: 1, mode: 'read-only-original-cellar-create-inspection', status: 'REVIEW_REQUIRED',
    createsAttempted: 0, updatesAttempted: 0, deletesAttempted: 0,
    normalMatches: normalMatches.length, uncachedFullMatches: freshMatches.length,
    uncachedScopedMatches: scopedMatches.length, newRowsOutsideBaseline: newRows.length,
    availableFields: [...new Set(fresh.flatMap(Object.keys))].sort(), fixtureState: 'UNCONFIRMED' }
  let fixture = null
  if (normalMatches.length === 0 && freshMatches.length === 0 && scopedMatches.length === 0 && newRows.length === 0) {
    report.status = 'INSPECTED'
    report.fixtureState = 'NO_NEW_FIXTURE_OBSERVED'
  } else if (normalMatches.length === 1 && freshMatches.length === 1 && scopedMatches.length === 1) {
    fixture = freshMatches[0]
    const direct = await freshProvider.get(CELLAR, fixture.id)
    report.originalOwnerProductMatch = same(fixture.user_id, userId) && same(fixture.product_id, receipt.productId)
    report.newCanonicalId = Boolean(idOf(fixture.id)) && !baseline.has(String(fixture.id))
    report.listDirectAgreement = [normalMatches[0], scopedMatches[0], direct].every((row) => fingerprint(row) === fingerprint(fixture))
    if (report.originalOwnerProductMatch && report.newCanonicalId && report.listDirectAgreement) {
      report.status = 'INSPECTED'
      report.fixtureState = 'EXACT_NONCE_FIXTURE_PRESENT'
    }
  }
  return { report, snapshot: { provenance: 'read-only-original-create-inspection', sourceSha, receipt, fixture } }
}

// This exercises the checked-out application gateway and real provider. Account
// identities come from verified release sessions; HTTP/session middleware and
// browser submission retain their separate connected-release checks.
// The worker is isolated and serial: restore the shared adapter in all cases.
export const runCellarWriteCertification = async ({ provider = dataProvider, userId, otherUserId = null,
  runKey, checkpoint = async () => {}, route = routeCellarRequest }) => {
  const report = {
    version: 1, mode: 'current-instance-candidate-cellar-gateway', status: 'BLOCKED',
    create: 'NOT_RUN', reload: 'NOT_RUN', update: 'NOT_RUN', nullableRelationships: 'NOT_RUN',
    giftRoundTrip: 'NOT_RUN', otherOwnerPolicy: 'NOT_RUN', cleanup: 'NOT_RUN',
    httpSessionMiddleware: 'NOT_RUN', browserSubmission: 'NOT_RUN',
    createsAttempted: 0, updatesAttempted: 0, deletesAttempted: 0, removed: 0
  }
  const original = { ...dataProvider }
  const raw = { ...provider }
  const baselineIds = new Set()
  const marker = `Pourfolio release QA ${runKey}`
  let createdId = null
  let productId = null
  let primaryFailure = null
  let activeUser = null
  const belongsToFixture = (row) => row && createdId && same(row.id, createdId) &&
    same(row.user_id, userId) && same(row.product_id, productId) && row.notes === marker
  const save = (stage) => checkpoint({ version: 1, kind: 'cellar-create-checkpoint', stage,
    userId, runKey, marker, productId, createdId, baselineIds: [...baselineIds],
    createsAttempted: report.createsAttempted, updatesAttempted: report.updatesAttempted,
    deletesAttempted: report.deletesAttempted })
  const call = async (method, user, id = null, body = undefined) => {
    activeUser = user
    const reply = { statusCode: null, body: null,
      status(code) { this.statusCode = code; return this },
      json(value) { this.body = value; return this }, end() { return this } }
    try {
      await route({ method, query: { path: id ? ['cellar', id] : ['cellar'] }, body }, reply, { id: user })
    } catch (error) {
      return { status: error.status || 500, code: safeCode(error) }
    } finally {
      activeUser = null
    }
    return { status: reply.statusCode, body: reply.body }
  }
  try {
    requireThat(typeof userId === 'string' && userId.trim() === userId && userId.length > 0,
      'CELLAR_TEST_OWNER_MISSING')
    requireThat(otherUserId === null || typeof otherUserId === 'string' && otherUserId.trim() === otherUserId &&
      otherUserId.length > 0 && otherUserId !== userId, 'CELLAR_TEST_ACCOUNTS_NOT_DISTINCT')
    requireThat(/^cellar-[a-f0-9-]{36}$/.test(runKey || ''), 'CELLAR_RUN_KEY_INVALID')
    const baseline = await readAllBonusCertificationRows(raw, CELLAR)
    for (const row of baseline) baselineIds.add(idOf(row.id))
    requireThat(!baseline.some((row) => same(row.user_id, userId) &&
      /^Pourfolio release QA cellar-[a-f0-9-]{36}$/.test(row.notes || '')), 'CELLAR_PRIOR_FIXTURE_UNRESOLVED')
    const productPage = await raw.listPage(COLLECTIONS.products,
      { page: 1, limit: 1, orderBy: 'id', order: 'asc', filters: {} })
    productId = idOf(productPage.items?.[0]?.id)
    requireThat(productId && same((await raw.get(COLLECTIONS.products, productId))?.id, productId),
      'CELLAR_TEST_PRODUCT_UNCONFIRMED')

    Object.assign(dataProvider, {
      ...raw,
      create: async (collection, body) => {
        requireThat(activeUser === userId && collection === CELLAR && report.createsAttempted === 0 &&
          same(body.user_id, userId) && same(body.product_id, productId) && body.notes === marker &&
          body.quantity === 1 && body.gift === 0, 'CELLAR_CREATE_SCOPE_UNCONFIRMED')
        await save('create-intent')
        report.createsAttempted += 1
        const receipt = await raw.create(collection, body)
        const id = idOf((Array.isArray(receipt) ? receipt[0] : receipt)?.id)
        requireThat(id && !baselineIds.has(id), 'CELLAR_CREATE_ID_UNCONFIRMED')
        createdId = id
        await save('create-acknowledged')
        return receipt
      },
      update: async (collection, id, body) => {
        requireThat(activeUser === userId && collection === CELLAR && createdId && same(id, createdId) &&
          report.updatesAttempted === 0 && body.quantity === 2 && body.gift === 1 &&
          Object.keys(body).every((key) => ['quantity', 'gift'].includes(key)) &&
          belongsToFixture(await raw.get(CELLAR, createdId)), 'CELLAR_UPDATE_SCOPE_UNCONFIRMED')
        await save('update-intent')
        report.updatesAttempted += 1
        return raw.update(collection, id, body)
      },
      compareAndSet: async () => { throw Object.assign(new Error('CELLAR_MUTATION_DISABLED'), { code: 'CELLAR_MUTATION_DISABLED' }) },
      remove: async (collection, id) => {
        requireThat(activeUser === userId && collection === CELLAR && createdId && same(id, createdId) &&
          report.deletesAttempted === 0 && !baselineIds.has(createdId) &&
          belongsToFixture(await raw.get(CELLAR, createdId)), 'CELLAR_DELETE_SCOPE_UNCONFIRMED')
        await save('delete-intent')
        report.deletesAttempted += 1
        return raw.remove(collection, id)
      }
    })

    const requested = { product_id: productId, quantity: 1, gift: 0, notes: marker,
      sharing_series_id: null, series_version_id: null, location_id: null,
      purchase_location_id: null, purchased_by_id: null, bet_id: null }
    const created = await call('POST', userId, null, requested)
    requireThat(created.status === 201 && same(created.body?.item?.id, createdId),
      created.code || 'CELLAR_CREATE_NOT_ACKNOWLEDGED')
    report.create = 'PASS'
    const reloaded = await verifyPersistedCellar({ provider: raw, id: createdId, userId,
      expected: requested })
    requireThat(belongsToFixture(reloaded) && created.body.item.gift === false, 'CELLAR_RELOAD_UNCONFIRMED')
    const ownerList = await call('GET', userId)
    requireThat(ownerList.status === 200 && ownerList.body?.items?.filter((row) =>
      same(row.id, createdId) && same(row.product_id, productId)).length === 1,
    'CELLAR_OWNER_LIST_UNCONFIRMED')
    report.reload = 'PASS'
    report.nullableRelationships = 'PASS'

    const updated = await call('PUT', userId, createdId, { quantity: 2, gift: 1 })
    requireThat(updated.status === 200 && Number(updated.body?.item?.quantity) === 2 &&
      updated.body.item.gift === true, updated.code || 'CELLAR_UPDATE_NOT_ACKNOWLEDGED')
    await verifyPersistedCellar({ provider: raw, id: createdId, userId,
      expected: { ...requested, quantity: 2, gift: 1 } })
    report.update = 'PASS'
    report.giftRoundTrip = 'PASS'

    if (otherUserId) {
      const before = fingerprint(await raw.get(CELLAR, createdId))
      const otherList = await call('GET', otherUserId)
      requireThat(otherList.status === 200 && Array.isArray(otherList.body?.items) &&
        !otherList.body.items.some((row) => same(row.id, createdId)), 'CELLAR_OTHER_OWNER_LIST_EXPOSED')
      for (const [method, body] of [['PUT', { quantity: 99 }], ['DELETE', undefined]]) {
        const denied = await call(method, otherUserId, createdId, body)
        requireThat(denied.status === 403 && fingerprint(await raw.get(CELLAR, createdId)) === before,
          'CELLAR_OTHER_OWNER_MUTATION_NOT_DENIED')
      }
      requireThat(report.updatesAttempted === 1 && report.deletesAttempted === 0,
        'CELLAR_OTHER_OWNER_REACHED_PROVIDER_MUTATION')
      report.otherOwnerPolicy = 'PASS'
    }
  } catch (error) {
    primaryFailure = safeCode(error)
  } finally {
    if (report.createsAttempted) report.cleanup = 'UNCONFIRMED'
    if (createdId) {
      try {
        requireThat(!baselineIds.has(createdId) && belongsToFixture(await raw.get(CELLAR, createdId)),
          'CELLAR_CLEANUP_PROVENANCE_UNCONFIRMED')
        const owner = await call('GET', userId)
        requireThat(owner.status === 200 && owner.body?.items?.filter((row) =>
          same(row.id, createdId) && same(row.product_id, productId) && row.notes === marker).length === 1,
        'CELLAR_CLEANUP_OWNER_UNCONFIRMED')
        const deleted = await call('DELETE', userId, createdId)
        requireThat(deleted.status === 204, deleted.code || 'CELLAR_DELETE_NOT_ACKNOWLEDGED')
        const remaining = await readAllBonusCertificationRows(raw, CELLAR)
        requireThat(await raw.get(CELLAR, createdId) === null &&
          !remaining.some((row) => same(row.id, createdId) || same(row.user_id, userId) && row.notes === marker),
        'CELLAR_CLEANUP_ABSENCE_UNCONFIRMED')
        report.cleanup = 'PASS'
        report.removed = 1
      } catch (error) {
        report.cleanupFailure = safeCode(error)
      }
    }
    Object.assign(dataProvider, original)
  }
  if (primaryFailure) report.failure = primaryFailure
  report.status = primaryFailure || report.cleanup !== 'PASS'
    ? report.createsAttempted ? 'FAIL' : 'BLOCKED'
    : otherUserId ? 'PASS' : 'PARTIAL'
  try { await save('finished') } catch { report.status = 'FAIL'; report.receiptFailure = 'CELLAR_CHECKPOINT_UNCONFIRMED' }
  return report
}
