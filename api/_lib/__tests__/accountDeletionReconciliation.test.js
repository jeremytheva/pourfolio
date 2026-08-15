import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ACCOUNT_DELETION_PLAN_COLLECTION_ORDER,
  ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS,
  buildAccountDeletionPlan
} from '../accountDeletionPlan.js'
import {
  ACCOUNT_DELETION_RECONCILIATION_FORMAT,
  ACCOUNT_DELETION_RECONCILIATION_SCHEMA_VERSION,
  reconcileAccountDeletionPlan
} from '../accountDeletionReconciliation.js'

const account = { id: 'owner-1', email: 'must-not-enter-result@example.test' }
const generatedAt = '2026-08-15T09:00:00.000Z'
const verifiedAt = '2026-08-15T09:05:00.000Z'

const emptySnapshot = () => Object.fromEntries(
  ACCOUNT_DELETION_SNAPSHOT_COLLECTIONS.map((collection) => [collection, []])
)

const completeSnapshot = () => ({
  profiles: [
    { id: account.id, user_id: account.id, name: 'PRIVATE-OWNER-PROFILE' },
    { id: 'profile-other', user_id: 'other-user', name: 'OTHER-PROFILE-SENTINEL' }
  ],
  ratings: [
    {
      id: 'rating-owner', user_id: account.id, product_id: 'product-owner',
      cellar_id: 'cellar-owner', notes: 'PRIVATE-OWNER-RATING'
    },
    {
      id: 'rating-other', user_id: 'other-user', product_id: 'product-other',
      cellar_id: 'cellar-other', notes: 'OTHER-RATING-SENTINEL'
    }
  ],
  rating_scores: [
    { id: 'score-owner', user_id: account.id, rating_id: 'rating-owner', attribute_score: 6 },
    { id: 'score-other', user_id: 'other-user', rating_id: 'rating-other', attribute_score: 4 }
  ],
  bonus_attribute_rating_mapping: [
    { id: 'mapping-owner', user_id: account.id, rating_id: 'rating-owner' },
    { id: 'mapping-other', user_id: 'other-user', rating_id: 'rating-other' }
  ],
  cellar: [
    { id: 'cellar-owner', user_id: account.id, product_id: 'product-owner' },
    { id: 'cellar-other', user_id: 'other-user', product_id: 'product-other' }
  ]
})

const otherOnlySnapshot = () => Object.fromEntries(
  Object.entries(completeSnapshot()).map(([collection, records]) => [
    collection,
    records.filter(({ user_id }) => user_id === 'other-user')
  ])
)

const buildPlan = (snapshot = completeSnapshot()) => buildAccountDeletionPlan({
  account,
  snapshot,
  generatedAt
})

const reconcile = (overrides = {}) => reconcileAccountDeletionPlan({
  account,
  plan: buildPlan(),
  snapshot: otherOnlySnapshot(),
  verifiedAt,
  ...overrides
})

const mutablePlan = () => structuredClone(buildPlan())

test('reports complete only after every planned owner record is absent', () => {
  const result = reconcile()

  assert.deepEqual(result, {
    format: ACCOUNT_DELETION_RECONCILIATION_FORMAT,
    schema_version: ACCOUNT_DELETION_RECONCILIATION_SCHEMA_VERSION,
    verified_at: verifiedAt,
    source_plan: {
      format: 'pourfolio.account-deletion-plan',
      schema_version: '1.0.0',
      generated_at: generatedAt
    },
    planned_total_count: 5,
    removed_planned_total_count: 5,
    remaining_planned_total_count: 0,
    unplanned_total_count: 0,
    remaining_total_count: 0,
    complete: true,
    collection_results: ACCOUNT_DELETION_PLAN_COLLECTION_ORDER.map((collection, index) => ({
      sequence: index + 1,
      collection,
      planned_count: 1,
      removed_planned_count: 1,
      remaining_planned_count: 0,
      unplanned_count: 0,
      remaining_total_count: 0
    }))
  })

  const json = JSON.stringify(result)
  for (const forbidden of [
    account.id, account.email, 'rating-owner', 'score-owner', 'mapping-owner',
    'cellar-owner', 'profile-other', 'OTHER-', 'PRIVATE-', 'product-owner'
  ]) {
    assert.equal(json.includes(forbidden), false, `${forbidden} must not enter reconciliation output`)
  }
})

test('reports exact remaining planned counts for a valid partial owner graph', () => {
  const partial = completeSnapshot()
  partial.rating_scores = partial.rating_scores.filter(({ user_id }) => user_id !== account.id)
  partial.bonus_attribute_rating_mapping = partial.bonus_attribute_rating_mapping.filter(
    ({ user_id }) => user_id !== account.id
  )

  const result = reconcile({ snapshot: partial })

  assert.equal(result.complete, false)
  assert.equal(result.planned_total_count, 5)
  assert.equal(result.removed_planned_total_count, 2)
  assert.equal(result.remaining_planned_total_count, 3)
  assert.equal(result.unplanned_total_count, 0)
  assert.equal(result.remaining_total_count, 3)
  assert.deepEqual(
    result.collection_results.map(({ remaining_planned_count }) => remaining_planned_count),
    [0, 0, 1, 1, 1]
  )
})

test('does not report complete when new owner data appears after discovery', () => {
  const later = otherOnlySnapshot()
  later.profiles.push({
    id: 'new-owner-profile',
    user_id: account.id,
    name: 'PRIVATE-NEW-OWNER-PROFILE'
  })

  const result = reconcile({ snapshot: later })

  assert.equal(result.complete, false)
  assert.equal(result.removed_planned_total_count, 5)
  assert.equal(result.remaining_planned_total_count, 0)
  assert.equal(result.unplanned_total_count, 1)
  assert.equal(result.remaining_total_count, 1)
  assert.equal(result.collection_results.at(-1).unplanned_count, 1)
  assert.equal(JSON.stringify(result).includes('new-owner-profile'), false)
})

test('reconciles an empty source plan and empty owner snapshot', () => {
  const plan = buildPlan(emptySnapshot())
  const result = reconcile({ plan, snapshot: emptySnapshot() })

  assert.equal(result.complete, true)
  assert.deepEqual([
    result.planned_total_count,
    result.removed_planned_total_count,
    result.remaining_planned_total_count,
    result.unplanned_total_count,
    result.remaining_total_count
  ], [0, 0, 0, 0, 0])
  assert.equal(result.collection_results.length, 5)
  assert.ok(result.collection_results.every((entry) =>
    entry.planned_count === 0 && entry.remaining_total_count === 0
  ))
})

test('rejects unsupported, non-canonical and unexpected plan envelope values', () => {
  assert.throws(() => reconcile({ plan: null }), /plan is invalid/)

  const format = mutablePlan()
  format.format = 'other-format'
  assert.throws(() => reconcile({ plan: format }), /format is unsupported/)

  const version = mutablePlan()
  version.schema_version = '2.0.0'
  assert.throws(() => reconcile({ plan: version }), /schema version is unsupported/)

  const timestamp = mutablePlan()
  timestamp.generated_at = '2026-08-15T09:00:00+00:00'
  assert.throws(() => reconcile({ plan: timestamp }), /generation time is not canonical/)

  const extraPlanKey = mutablePlan()
  extraPlanKey.account_id = account.id
  assert.throws(() => reconcile({ plan: extraPlanKey }), /plan keys are invalid/)

  const extraCountKey = mutablePlan()
  extraCountKey.record_counts.other = 0
  assert.throws(() => reconcile({ plan: extraCountKey }), /record counts keys are invalid/)

  const extraStepKey = mutablePlan()
  extraStepKey.steps[0].record_body = { private: true }
  assert.throws(() => reconcile({ plan: extraStepKey }), /step keys are invalid/)

  assert.throws(
    () => reconcile({ verifiedAt: '2026-08-15T08:59:59.999Z' }),
    /cannot precede plan generation/
  )
})

test('rejects invalid step order, identifiers and count reconciliation', () => {
  const missingStep = mutablePlan()
  missingStep.steps.pop()
  assert.throws(() => reconcile({ plan: missingStep }), /steps are invalid/)

  const order = mutablePlan()
  order.steps[0].collection = 'rating_scores'
  assert.throws(() => reconcile({ plan: order }), /step order is invalid/)

  const sequence = mutablePlan()
  sequence.steps[0].sequence = 2
  assert.throws(() => reconcile({ plan: sequence }), /step order is invalid/)

  const nonString = mutablePlan()
  nonString.steps[0].record_ids[0] = 1
  assert.throws(() => reconcile({ plan: nonString }), /contains an invalid identifier/)

  const empty = mutablePlan()
  empty.steps[0].record_ids[0] = '   '
  assert.throws(() => reconcile({ plan: empty }), /contains an invalid identifier/)

  const duplicate = mutablePlan()
  duplicate.steps[0].record_ids = ['same', 'same']
  duplicate.steps[0].count = 2
  duplicate.record_counts[duplicate.steps[0].collection] = 2
  duplicate.total_records = 6
  assert.throws(() => reconcile({ plan: duplicate }), /contains duplicate identifiers/)

  const unsorted = mutablePlan()
  unsorted.steps[0].record_ids = ['z', 'a']
  unsorted.steps[0].count = 2
  unsorted.record_counts[unsorted.steps[0].collection] = 2
  unsorted.total_records = 6
  assert.throws(() => reconcile({ plan: unsorted }), /identifiers are not sorted/)

  const stepCount = mutablePlan()
  stepCount.steps[0].count = 2
  assert.throws(() => reconcile({ plan: stepCount }), /counts do not reconcile/)

  const mappedCount = mutablePlan()
  mappedCount.record_counts[mappedCount.steps[0].collection] = -1
  assert.throws(() => reconcile({ plan: mappedCount }), /record count is invalid/)

  const total = mutablePlan()
  total.total_records = 4
  assert.throws(() => reconcile({ plan: total }), /total record count does not reconcile/)
})

test('fails closed on invalid later snapshots and deeply freezes deterministic results', () => {
  const missing = otherOnlySnapshot()
  delete missing.cellar
  assert.throws(() => reconcile({ snapshot: missing }), /collection cellar is missing or invalid/)

  const orphan = completeSnapshot()
  orphan.ratings = orphan.ratings.filter(({ user_id }) => user_id !== account.id)
  assert.throws(() => reconcile({ snapshot: orphan }), /score references an unavailable owner rating/)

  const result = reconcile()
  const retry = reconcile()
  const later = reconcile({ verifiedAt: '2026-08-15T09:06:00.000Z' })
  assert.deepEqual(retry, result)
  assert.notDeepEqual(later, result)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.source_plan), true)
  assert.equal(Object.isFrozen(result.collection_results), true)
  assert.ok(result.collection_results.every(Object.isFrozen))
})

test('keeps reconciliation server-only and unreachable from provider or browser entrypoints', async () => {
  const [source, authProxySource, dataProxySource, clientSource, appSource] = await Promise.all([
    readFile(new URL('../accountDeletionReconciliation.js', import.meta.url), 'utf8'),
    readFile(new URL('../../auth-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../data-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/lib/nocodeBackend.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/App.jsx', import.meta.url), 'utf8')
  ])

  for (const pattern of [
    /\bfetch\s*\(/, /dataProvider/, /process\.env/, /console\./,
    /\.remove\s*\(/, /compareAndSet/, /DELETE MY ACCOUNT/
  ]) {
    assert.doesNotMatch(source, pattern)
  }
  for (const reachableSource of [authProxySource, dataProxySource, clientSource, appSource]) {
    assert.doesNotMatch(
      reachableSource,
      /accountDeletionReconciliation|account-deletion-reconciliation/
    )
  }
})
