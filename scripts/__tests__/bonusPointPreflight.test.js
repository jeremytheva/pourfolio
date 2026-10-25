import assert from 'node:assert/strict'
import test from 'node:test'
import { readSnapshot, runBonusPointPreflight, runBonusPointPreflightCli } from '../run-bonus-point-preflight.js'

const capturedAt = '2026-10-25T00:00:00Z'
const environmentRef = 'test-provider-environment'
const row = (id, point_value = null, user_id = null) => ({ id, user_id, description: 'Descriptor ' + id, point_value })
const plan = (attributes) => JSON.stringify({
  version: 1, source_ref: 'owner-values', reviewer_ref: 'independent-review',
  reviewed_at: capturedAt, attributes
})
const values = (rows, point_value = '0.50') => rows.filter((item) => item.user_id === null)
  .map(({ id, description }) => ({ id, description, point_value }))
const providerFor = (rows, { estimated = false, transform = (value) => value } = {}) => {
  const calls = []
  const provider = {
    calls,
    async listPage(collection, options) {
      calls.push({ collection, ...options })
      const { page, limit } = options
      const items = rows.slice((page - 1) * limit, page * limit)
      const more = estimated && items.length === limit
      return transform({
        items, page, pageSize: limit, total: more ? page * limit + 1 : rows.length,
        totalPages: more ? page + 1 : estimated ? page : Math.ceil(rows.length / limit),
        ...(estimated ? { totalIsEstimate: more } : {})
      }, page)
    },
    create() { assert.fail('Preflight attempted create') },
    update() { assert.fail('Preflight attempted update') },
    compareAndSet() { assert.fail('Preflight attempted compareAndSet') },
    remove() { assert.fail('Preflight attempted remove') }
  }
  return provider
}
const read = (provider, options = {}) => readSnapshot(provider, { environmentRef, capturedAt, ...options })
const run = (provider, planBytes, options = {}) => runBonusPointPreflight({
  provider, planBytes, environmentRef, capturedAt, ...options
})
const rejectsCode = (promise, code) => assert.rejects(promise, (error) => error.code === code)

test('preflight reads complete exact pages fresh and never invokes provider writes', async () => {
  const rows = [row(1), row(2, '0.50'), row(3, '0.70', 'private-owner')]
  const provider = providerFor(rows)
  const snapshot = await read(provider, { pageSize: 2 })
  assert.equal(snapshot.complete, true)
  assert.deepEqual(snapshot.attributes, rows)
  assert.deepEqual(provider.calls.map(({ collection, page, limit, orderBy, order, filters, fresh }) => ({
    collection, page, limit, orderBy, order, filters, fresh
  })), [1, 2].map((page) => ({
    collection: 'bonus_attributes', page, limit: 2, orderBy: 'id', order: 'asc', filters: {}, fresh: true
  })))
  const result = await run(providerFor(rows), plan(values(rows)), { pageSize: 2 })
  assert.equal(result.status, 'PASS')
  assert.equal(result.counts.proposedFills, 1)
  assert.equal(result.counts.alreadyMatched, 1)
  assert.equal(result.counts.private, 1)
})

test('preflight accepts coherent estimated progression only after an exact terminal count', async () => {
  const rows = [row(1), row(2), row(3), row(4)]
  const provider = providerFor(rows, { estimated: true })
  assert.equal((await read(provider, { pageSize: 2 })).attributes.length, 4)
  assert.equal(provider.calls.length, 3)
  const incoherent = providerFor(rows, { estimated: true, transform: (page) => ({ ...page, total: page.total + 1 }) })
  await rejectsCode(read(incoherent, { pageSize: 2 }), 'PROVIDER_PAGINATION_INVALID')
})

test('preflight bounds reads and rejects count drift or malformed pagination', async () => {
  const rows = [row(1), row(2), row(3)]
  await rejectsCode(read(providerFor(rows), { pageSize: 1, maxPages: 2 }), 'PROVIDER_PAGINATION_INVALID')
  const unlimited = providerFor(rows, { estimated: true })
  await rejectsCode(read(unlimited, { pageSize: 1, maxPages: 2 }), 'PROVIDER_PAGE_LIMIT_REACHED')
  assert.equal(unlimited.calls.length, 2)
  const drift = providerFor(rows, { transform: (value, page) => page === 2 ? { ...value, total: 4 } : value })
  await rejectsCode(read(drift, { pageSize: 2 }), 'PROVIDER_COUNT_DRIFT')
  for (const patch of [{ page: 2 }, { pageSize: 1 }, { total: NaN }, { totalPages: 3 },
    { totalIsEstimate: 'false' }, { items: null }]) {
    await rejectsCode(read(providerFor(rows, { transform: (value) => ({ ...value, ...patch }) })), 'PROVIDER_PAGINATION_INVALID')
  }
})

test('preflight rejects unsafe or repeated IDs, missing ownership and incomplete fields', async () => {
  for (const rows of [[row(1), row('1')], [row(0)], [row('9007199254740992')]]) {
    await rejectsCode(read(providerFor(rows)), 'PROVIDER_ID_INVALID_OR_DUPLICATED')
  }
  for (const owner of [undefined, 12, {}]) {
    await rejectsCode(read(providerFor([{ ...row(1), user_id: owner }])), 'PROVIDER_OWNERSHIP_UNCONFIRMED')
  }
  const noOwner = row(1)
  delete noOwner.user_id
  await rejectsCode(read(providerFor([noOwner])), 'PROVIDER_OWNERSHIP_UNCONFIRMED')
  const noPoint = row(1)
  delete noPoint.point_value
  await rejectsCode(read(providerFor([noPoint])), 'PROVIDER_ATTRIBUTE_FIELDS_INCOMPLETE')
  await rejectsCode(read(providerFor([{ ...row(1), description: '' }])), 'PROVIDER_ATTRIBUTE_FIELDS_INCOMPLETE')
})

test('partial 82-descriptor allocation distinguishes 81 missing values from 39 proposed fills and 42 unresolved', async () => {
  const rows = Array.from({ length: 82 }, (_, index) => row(index + 1, index === 50 ? '0.50' : null))
  rows.push(row(83, '0.70', 'private-owner'))
  const allocations = values(rows, null).map((item, index) => ({
    ...item, point_value: index < 39 || item.id === 51 ? '0.50' : null,
    ...(item.id === 51 ? { value_source: 'preserve-existing-explicit-provider-value' } : {})
  }))
  const result = await run(providerFor(rows), plan(allocations))
  assert.equal(result.status, 'BLOCKED')
  assert.deepEqual(result.blockers, ['PLAN_POINT_VALUE_INVALID'])
  assert.equal(result.counts.global, 82)
  assert.equal(result.counts.globalMissingValues, 81)
  assert.equal(result.counts.proposedFills, 39)
  assert.equal(result.counts.unresolvedPlanValues, 42)
  assert.equal(result.counts.alreadyMatched, 1)
  assert.equal(result.counts.private, 1)
})

test('preserved explicit values cannot become proposed fills or silently change', async () => {
  const preserved = [{ id: 51, description: 'Descriptor 51', point_value: '0.50',
    value_source: 'preserve-existing-explicit-provider-value' }]
  const absentValue = await run(providerFor([row(51)]), plan(preserved))
  assert.equal(absentValue.status, 'BLOCKED')
  assert.ok(absentValue.blockers.includes('PRESERVED_VALUE_MISSING'))
  assert.equal(absentValue.counts.proposedFills, 0)
  assert.equal(absentValue.counts.preservedMissingValues, 1)
  const gone = await run(providerFor([row(52)]), plan(preserved))
  assert.ok(gone.blockers.includes('PRESERVED_VALUE_MISSING'))
  const conflict = await run(providerFor([row(51, '0.51')]), plan(preserved))
  assert.ok(conflict.blockers.includes('PRESERVED_VALUE_CONFLICT'))
  const matched = await run(providerFor([row(51, 0.5)]), plan(preserved))
  assert.equal(matched.status, 'PASS')
})

test('provider rows, private identities and raw errors never enter returned summaries', async () => {
  const secret = 'private-identity-never-log'
  const rows = [row(1), { ...row(2, '0.70', secret), description: 'private-descriptor-never-log', hidden: secret }]
  const result = await run(providerFor(rows), plan(values(rows)))
  const encoded = JSON.stringify(result)
  assert.equal(result.qualification, 'SOURCE_ONLY')
  assert.equal(result.snapshotScope, 'PAGINATION_COMPLETE_NOT_ATOMIC')
  assert.match(result.snapshotSha256, /^[a-f0-9]{64}$/)
  assert.match(result.planSha256, /^[a-f0-9]{64}$/)
  for (const forbidden of [secret, 'private-descriptor-never-log', 'Descriptor 1', environmentRef, 'attributes']) {
    assert.ok(!encoded.includes(forbidden))
  }
  await rejectsCode(read({ listPage() { throw new Error(secret) } }), 'PROVIDER_READ_UNCONFIRMED')
})

test('invalid plan bytes and incomplete plans fail without inferred values', async () => {
  const rows = [row(1)]
  const invalidJson = await run(providerFor(rows), '{')
  assert.deepEqual(invalidJson.blockers, ['INPUT_JSON_OR_UTF8_INVALID'])
  const missingPlanValue = await run(providerFor(rows), plan([{ id: 1, description: 'Descriptor 1' }]))
  assert.equal(missingPlanValue.status, 'BLOCKED')
  assert.equal(missingPlanValue.counts.proposedFills, 0)
  await rejectsCode(run(providerFor(rows), {}), 'PREFLIGHT_PLAN_BYTES_REQUIRED')
})

test('CLI rejects write flags, missing runtime and mismatched source before reading files or loading provider', async () => {
  const sha = 'a'.repeat(40)
  const env = {
    RUN_LIVE_BONUS_POINT_PREFLIGHT: '1', PREFLIGHT_CANDIDATE_SHA: sha, GITHUB_SHA: sha,
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_INSTANCE: 'private-instance', NOCODEBACKEND_SECRET_KEY: 'private-secret'
  }
  const options = { env, readFile() { assert.fail('Guard read a file') }, loadProvider() { assert.fail('Guard loaded provider') } }
  await rejectsCode(runBonusPointPreflightCli(['--apply'], options), 'PREFLIGHT_ARGUMENTS_NOT_SUPPORTED')
  for (const patch of [{ RUN_LIVE_BONUS_POINT_PREFLIGHT: '0' }, { PREFLIGHT_CANDIDATE_SHA: 'a'.repeat(39) },
    { GITHUB_SHA: 'b'.repeat(40) }]) {
    await rejectsCode(runBonusPointPreflightCli([], { ...options, env: { ...env, ...patch } }), 'PREFLIGHT_EXECUTION_GUARD_NOT_SATISFIED')
  }
  for (const name of ['NOCODEBACKEND_DATA_BASE_URL', 'NOCODEBACKEND_INSTANCE', 'NOCODEBACKEND_SECRET_KEY']) {
    await rejectsCode(runBonusPointPreflightCli([], { ...options, env: { ...env, [name]: '' } }), 'PREFLIGHT_RUNTIME_CONFIGURATION_MISSING')
  }
})
