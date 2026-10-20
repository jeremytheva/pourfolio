import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { inspectBrowserRatingFixture, resolveBrowserRatingOwner } from '../browser-rating-fixture-inspection.js'

const fixture = { kind: 'browser-created-and-deleted-rating', ratingId: '9801', productId: '1',
  dateRated: '2026-10-20', expectedTotal: 2.82, runtimeCommit: 'c'.repeat(40),
  olderRatings: [{ id: '622', total: 3.51 }, { id: '365', total: 4.36 }],
  expectedCommunityCount: 4, expectedPersonalCount: 2, createsAttempted: 1, deletesAttempted: 1 }
const owner = 'private-owner'
const context = () => {
  const rows = { ratings: [
    { id: '622', user_id: owner, product_id: '1', submission_state: 'complete', total_weighted: '3.51' },
    { id: '365', user_id: owner, product_id: '1', submission_state: 'complete', total_weighted: '4.36' },
    { id: '5', user_id: 'someone-else', product_id: '1', submission_state: 'complete', total_weighted: 4 },
    { id: '6', user_id: 'someone-else', product_id: '1', submission_state: 'complete', total_weighted: 4 }
  ], rating_scores: [], bonus_attribute_rating_mapping: [],
  profiles: [{ id: '99', public_id: 'test-public-profile', user_id: owner }] }
  let reads = 0
  const provider = {
    async get(collection, id, options) { reads += 1; assert.deepEqual(options, { fresh: true }); return rows[collection].find((row) => String(row.id) === String(id)) || null },
    async listPage(collection, options) { reads += 1; assert.equal(options.fresh, true); return { items: rows[collection], totalPages: 1 } },
    async list(collection, filters, options) { reads += 1; assert.deepEqual(options, { fresh: true }); return rows[collection].filter((row) => String(row.rating_id) === String(filters.rating_id)) },
    create: () => assert.fail('no mutation'), update: () => assert.fail('no mutation'), remove: () => assert.fail('no mutation')
  }
  return { rows, provider, reads: () => reads, run: (changes = {}) => inspectBrowserRatingFixture({ provider, userId: owner, fixture: { ...fixture, ...changes } }) }
}

test('the observed browser public-profile fingerprint resolves a fresh owner independently of release credentials', async () => {
  const c = context()
  const publicProfileFingerprint = createHash('sha256').update('test-public-profile').digest('hex')
  assert.deepEqual(await resolveBrowserRatingOwner({ provider: c.provider, publicProfileFingerprint }),
    { id: owner, source: 'observed-browser-public-profile-link' })
})

test('ambiguous, absent, changed or invalid public-profile bindings never substitute an owner', async () => {
  const publicProfileFingerprint = createHash('sha256').update('test-public-profile').digest('hex')
  for (const change of ['missing', 'duplicate', 'changed']) {
    const c = context()
    if (change === 'missing') c.rows.profiles = []
    if (change === 'duplicate') c.rows.profiles.push({ ...c.rows.profiles[0], id: '100' })
    if (change === 'changed') c.provider.get = async () => ({ ...c.rows.profiles[0], user_id: 'someone-else' })
    await assert.rejects(resolveBrowserRatingOwner({ provider: c.provider, publicProfileFingerprint }),
      { code: 'RATING_UI_PROFILE_BINDING_UNCONFIRMED' })
  }
  const c = context()
  await assert.rejects(resolveBrowserRatingOwner({ provider: c.provider, publicProfileFingerprint: '' }),
    { code: 'RATING_UI_PROFILE_BINDING_UNCONFIRMED' })
  assert.equal(c.reads(), 0)
})

test('browser fixture absence requires full/scoped child absence and preserved owner/community baseline', async () => {
  const c = context(), result = await c.run()
  assert.equal(result.status, 'PASS')
  assert.equal(result.parentState, 'ABSENT')
  assert.equal(result.olderRatingsPreserved, true)
  assert.equal(result.scoreChildren, 0)
  assert.equal(result.bonusMappings, 0)
  assert.deepEqual([result.createsAttempted, result.updatesAttempted, result.deletesAttempted], [0, 0, 0])
  assert.ok(!JSON.stringify(result).includes(owner))
  assert.ok(!JSON.stringify(result).includes(fixture.ratingId))
})

test('a valid owner/product-matched terminal tombstone is retained without mutation', async () => {
  const c = context()
  c.rows.ratings.push({ id: fixture.ratingId, user_id: owner, product_id: '1', submission_state: 'deleted',
    submission_version: 2, deleted_at: '2026-10-20 05:14:00', date_rated: '2026-10-20 05:12:00', total_weighted: 2.82 })
  const result = await c.run()
  assert.equal(result.status, 'PASS')
  assert.equal(result.parentState, 'DELETED_TOMBSTONE')
})

test('either remaining child collection fails even if a scoped query silently misses the row', async () => {
  for (const collection of ['rating_scores', 'bonus_attribute_rating_mapping']) {
    const c = context()
    c.rows[collection].push({ id: '77', rating_id: fixture.ratingId, user_id: owner })
    c.provider.list = async () => []
    assert.equal((await c.run()).failure, 'RATING_UI_FIXTURE_CHILDREN_REMAIN')
  }
})

test('active or contradictory deleted parent does not become a successful cleanup report', async () => {
  for (const changes of [{ submission_state: 'complete' }, { submission_version: '' }, { deleted_at: null }]) {
    const c = context()
    c.rows.ratings.push({ id: fixture.ratingId, user_id: owner, product_id: '1', submission_state: 'deleted',
      submission_version: 2, deleted_at: '2026-10-20 05:14:00', date_rated: '2026-10-20', total_weighted: 2.82, ...changes })
    assert.equal((await c.run()).failure, 'RATING_UI_PARENT_NOT_TERMINAL')
  }
})

test('wrong owner, changed old scores and direct/full disagreement fail closed', async () => {
  const foreignFixture = context()
  foreignFixture.rows.ratings.push({ id: fixture.ratingId, user_id: 'foreign-owner', product_id: '1',
    submission_state: 'deleted', submission_version: 2, deleted_at: '2026-10-20 05:14:00',
    date_rated: '2026-10-20', total_weighted: 2.82 })
  assert.equal((await foreignFixture.run()).failure, 'RATING_UI_PARENT_PROVENANCE_UNCONFIRMED')
  const wrongOwner = context()
  wrongOwner.rows.ratings[0].user_id = 'foreign-owner'
  assert.equal((await wrongOwner.run()).failure, 'RATING_UI_BASELINE_NOT_RESTORED')
  const changed = context()
  changed.rows.ratings[0].total_weighted = 1
  assert.equal((await changed.run()).failure, 'RATING_UI_BASELINE_NOT_RESTORED')
  const disagreement = context()
  disagreement.provider.get = async () => ({ id: fixture.ratingId })
  assert.equal((await disagreement.run()).failure, 'RATING_UI_PARENT_READS_DISAGREE')
})

test('unknown fixture identity and invalid execution counts block before provider reads', async () => {
  for (const change of [{ ratingId: '622' }, { createsAttempted: 2 }, { deletesAttempted: 0 },
    { runtimeCommit: '' }, { expectedTotal: '2.82' }, { expectedCommunityCount: 1 }]) {
    const c = context()
    await assert.rejects(c.run(change), { code: 'RATING_UI_INSPECTION_SCOPE_UNCONFIRMED' })
    assert.equal(c.reads(), 0)
  }
})

test('malformed child references, duplicate pages and read failures cannot fabricate absence', async () => {
  const malformed = context()
  malformed.rows.rating_scores.push({ id: '7' })
  await assert.rejects(malformed.run(), { code: 'RATING_UI_CHILD_INVENTORY_UNCONFIRMED' })
  const duplicate = context()
  duplicate.rows.ratings.push({ ...duplicate.rows.ratings[0] })
  await assert.rejects(duplicate.run(), { code: 'BONUS_BASELINE_INVALID' })
  const unavailable = context()
  unavailable.provider.get = async () => { throw Object.assign(new Error('private provider body'), { code: 'PROVIDER_ERROR' }) }
  await assert.rejects(unavailable.run(), { code: 'PROVIDER_ERROR' })
})
