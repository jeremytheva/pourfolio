import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ACCOUNT_DELETION_PLAN_COLLECTION_ORDER,
  ACCOUNT_DELETION_PLAN_FORMAT,
  ACCOUNT_DELETION_PLAN_SCHEMA_VERSION,
  ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS,
  buildAccountDeletionPlan
} from '../accountDeletionPlan.js'

const generatedAt = '2026-08-15T08:40:00.000Z'
const account = { id: 'owner-1', email: 'must-not-enter-plan@example.test' }

const emptySnapshot = () => Object.fromEntries(
  ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS.map((collection) => [collection, []])
)

const completeSnapshot = () => ({
  profiles: [
    {
      id: account.id, user_id: account.id, name: 'PRIVATE OWNER NAME',
      description: 'PRIVATE PROFILE BODY', secret_key: 'profile-secret'
    },
    { id: 'profile-other', user_id: 'other-user', name: 'OTHER-PROFILE-SENTINEL' }
  ],
  ratings: [
    {
      id: 2, user_id: account.id, product_id: 200, cellar_id: null,
      submission_state: 'deleted', submission_fingerprint: 'private-fingerprint'
    },
    {
      id: 'rating-1', user_id: account.id, product_id: 100, cellar_id: 'cellar-1',
      submission_state: 'deleting', submission_key: 'private-submission-key'
    },
    {
      id: 'rating-other', user_id: 'other-user', product_id: 999, cellar_id: 'cellar-other',
      submission_state: 'complete', notes: 'OTHER-RATING-SENTINEL'
    }
  ],
  rating_scores: [
    { id: 2, user_id: account.id, rating_id: '2', attribute_score: 4 },
    { id: 'score-1', user_id: account.id, rating_id: 'rating-1', attribute_score: 6 },
    { id: 'score-other', user_id: 'other-user', rating_id: 'rating-other', notes: 'OTHER-SCORE-SENTINEL' }
  ],
  bonus_attribute_rating_mapping: [
    { id: 2, user_id: account.id, rating_id: 2, bonus_attributes_id: 2 },
    { id: 'mapping-1', user_id: account.id, rating_id: 'rating-1', bonus_attributes_id: 1 },
    { id: 'mapping-other', user_id: 'other-user', rating_id: 'rating-other', notes: 'OTHER-MAPPING-SENTINEL' }
  ],
  cellar: [
    { id: 2, user_id: account.id, product_id: 200, notes: 'PRIVATE CELLAR BODY' },
    { id: 'cellar-1', user_id: account.id, product_id: 100, secret_key: 'cellar-secret' },
    { id: 'SPACED-OWNER-SENTINEL', user_id: ` ${account.id} `, product_id: 100 },
    { id: 'cellar-other', user_id: 'other-user', product_id: 999, notes: 'OTHER-CELLAR-SENTINEL' }
  ],
  products: [{ id: 100, product_name: 'CATALOGUE-SENTINEL' }]
})

const build = (overrides = {}) => buildAccountDeletionPlan({
  account,
  snapshot: completeSnapshot(),
  generatedAt,
  ...overrides
})

test('builds the exact deterministic child-first owner deletion plan', () => {
  const plan = build()

  assert.equal(plan.format, ACCOUNT_DELETION_PLAN_FORMAT)
  assert.equal(plan.schema_version, ACCOUNT_DELETION_PLAN_SCHEMA_VERSION)
  assert.equal(plan.generated_at, generatedAt)
  assert.equal(plan.total_records, 9)
  assert.deepEqual(plan.record_counts, {
    bonus_attribute_rating_mapping: 2,
    rating_scores: 2,
    ratings: 2,
    cellar: 2,
    profiles: 1
  })
  assert.deepEqual(plan.steps, [
    {
      sequence: 1,
      collection: 'bonus_attribute_rating_mapping',
      count: 2,
      record_ids: ['2', 'mapping-1']
    },
    { sequence: 2, collection: 'rating_scores', count: 2, record_ids: ['2', 'score-1'] },
    { sequence: 3, collection: 'ratings', count: 2, record_ids: ['2', 'rating-1'] },
    { sequence: 4, collection: 'cellar', count: 2, record_ids: ['2', 'cellar-1'] },
    { sequence: 5, collection: 'profiles', count: 1, record_ids: [account.id] }
  ])
  assert.deepEqual(
    plan.steps.map(({ collection }) => collection),
    ACCOUNT_DELETION_PLAN_COLLECTION_ORDER
  )

  const json = JSON.stringify(plan)
  assert.equal(Object.hasOwn(plan, 'account'), false)
  assert.equal(Object.hasOwn(plan, 'account_id'), false)
  for (const forbidden of [
    account.email, 'PRIVATE', 'OTHER-', 'SPACED-OWNER', 'secret_key', 'submission_state',
    'submission_fingerprint', 'submission_key', 'product_id', 'CATALOGUE-SENTINEL'
  ]) {
    assert.equal(json.includes(forbidden), false, `${forbidden} must not enter the deletion plan`)
  }
})

test('builds five immutable empty steps for an owner with no records', () => {
  const plan = build({ snapshot: emptySnapshot(), account: { id: account.id } })

  assert.equal(plan.total_records, 0)
  assert.deepEqual(Object.values(plan.record_counts), [0, 0, 0, 0, 0])
  assert.equal(plan.steps.length, 5)
  assert.ok(plan.steps.every(({ count, record_ids }) => count === 0 && record_ids.length === 0))
})

test('rejects incomplete, malformed and owner-ambiguous snapshots', () => {
  const missing = completeSnapshot()
  delete missing.cellar
  assert.throws(() => build({ snapshot: missing }), /collection cellar is missing or invalid/)

  const invalidCollection = completeSnapshot()
  invalidCollection.ratings = {}
  assert.throws(() => build({ snapshot: invalidCollection }), /collection ratings is missing or invalid/)

  const invalidRecord = completeSnapshot()
  invalidRecord.profiles.push(null)
  assert.throws(() => build({ snapshot: invalidRecord }), /profiles contains an invalid record/)

  const missingIdentifier = completeSnapshot()
  delete missingIdentifier.cellar[0].id
  assert.throws(() => build({ snapshot: missingIdentifier }), /cellar record identifier is invalid/)

  const missingOwner = completeSnapshot()
  delete missingOwner.rating_scores[0].user_id
  assert.throws(() => build({ snapshot: missingOwner }), /rating_scores record owner identifier is invalid/)

  assert.throws(() => buildAccountDeletionPlan({ account: null, snapshot: emptySnapshot() }), /identity is invalid/)
  assert.throws(() => build({ account: { id: '' } }), /account identifier is missing/)
  assert.throws(() => build({ generatedAt: 'not-a-date' }), /generation time is invalid/)
})

test('rejects duplicate identifiers and multiple exact-owner profiles', () => {
  const duplicate = completeSnapshot()
  duplicate.ratings.push({ id: 'rating-1', user_id: 'other-user', product_id: 999 })
  assert.throws(() => build({ snapshot: duplicate }), /ratings contains a duplicate record identifier/)

  const profiles = completeSnapshot()
  profiles.profiles.push({ id: 'profile-2', user_id: account.id, name: 'Second' })
  assert.throws(() => build({ snapshot: profiles }), /multiple owned profiles/)
})

test('rejects owned rating children without an included owner parent', () => {
  const orphanScore = completeSnapshot()
  orphanScore.rating_scores[0].rating_id = 'missing-rating'
  assert.throws(() => build({ snapshot: orphanScore }), /score references an unavailable owner rating/)

  const crossOwnerBonus = completeSnapshot()
  crossOwnerBonus.bonus_attribute_rating_mapping[0].rating_id = 'rating-other'
  assert.throws(() => build({ snapshot: crossOwnerBonus }), /mapping references an unavailable owner rating/)
})

test('rejects unavailable, cross-owner and cross-product cellar relationships', () => {
  const missing = completeSnapshot()
  missing.ratings[1].cellar_id = 'missing-cellar'
  assert.throws(() => build({ snapshot: missing }), /unavailable owner cellar record/)

  const crossOwner = completeSnapshot()
  crossOwner.ratings[1].cellar_id = 'cellar-other'
  assert.throws(() => build({ snapshot: crossOwner }), /unavailable owner cellar record/)

  const crossProduct = completeSnapshot()
  crossProduct.cellar[1].product_id = 200
  assert.throws(() => build({ snapshot: crossProduct }), /reference different products/)
})

test('freezes every output level and remains deterministic across retries', () => {
  const plan = build()
  const retry = build()
  const later = build({ generatedAt: '2026-08-15T08:40:01.000Z' })

  assert.deepEqual(retry, plan)
  assert.notDeepEqual(later, plan)
  assert.equal(Object.isFrozen(plan), true)
  assert.equal(Object.isFrozen(plan.record_counts), true)
  assert.equal(Object.isFrozen(plan.steps), true)
  assert.ok(plan.steps.every((step) => Object.isFrozen(step) && Object.isFrozen(step.record_ids)))
})

test('keeps discovery planning server-only and unreachable from deletion or browser entrypoints', async () => {
  const [plannerSource, authProxySource, dataProxySource, clientSource, appSource] = await Promise.all([
    readFile(new URL('../accountDeletionPlan.js', import.meta.url), 'utf8'),
    readFile(new URL('../../auth-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../data-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/lib/nocodeBackend.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/App.jsx', import.meta.url), 'utf8')
  ])

  for (const pattern of [
    /\bfetch\s*\(/, /dataProvider/, /process\.env/, /console\./,
    /\.remove\s*\(/, /compareAndSet/, /DELETE MY ACCOUNT/
  ]) {
    assert.doesNotMatch(plannerSource, pattern)
  }
  for (const reachableSource of [authProxySource, dataProxySource, clientSource, appSource]) {
    assert.doesNotMatch(reachableSource, /accountDeletionPlan|account-deletion-plan/)
  }
})
