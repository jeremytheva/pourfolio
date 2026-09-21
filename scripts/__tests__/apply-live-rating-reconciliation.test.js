import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../../api/_lib/dataProvider.js'
import {
  LIVE_RATING_RECONCILIATION_CONFIRMATION,
  buildLiveRatingReconciliationPlan,
  runLiveRatingReconciliation
} from '../apply-live-rating-reconciliation.js'

const originalProviderMethods = { ...dataProvider }

afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
})

const fixture = () => ({
  ratings: [
    {
      id: 1,
      user_id: 'user-1',
      product_id: 10,
      total_weighted: 4,
      submission_state: 'pending',
      submission_version: 0,
      submission_key: '',
      submission_fingerprint: ''
    },
    {
      id: 2,
      user_id: 'user-1',
      product_id: 11,
      total_weighted: 4.5,
      submission_state: 'complete',
      submission_version: 1,
      submission_key: 'user-1:modern',
      submission_fingerprint: 'modern'
    },
    {
      id: 3,
      user_id: 'user-1',
      product_id: 12,
      total_weighted: null,
      submission_state: 'pending',
      submission_version: 0,
      submission_key: '',
      submission_fingerprint: ''
    }
  ],
  scores: [
    { id: 11, user_id: 'user-1', rating_id: 1, attribute_id: 5, attribute_score: 6 },
    { id: 12, user_id: 'user-1', rating_id: 2, attribute_id: 5, attribute_score: 6 },
    { id: 13, user_id: 'user-1', rating_id: 3, attribute_id: 5, attribute_score: 6 }
  ],
  bonuses: []
})

const installProvider = (state, { staleGet = false } = {}) => {
  const updates = []

  dataProvider.listPage = async (collection, options = {}) => {
    let source
    if (collection === COLLECTIONS.ratings) source = state.ratings
    else if (collection === COLLECTIONS.ratingScores) source = state.scores
    else if (collection === COLLECTIONS.bonusRatingMappings) source = state.bonuses
    else assert.fail(`Unexpected collection: ${collection}`)

    const userId = options.filters?.user_id
    const items = userId
      ? source.filter((item) => String(item.user_id) === String(userId))
      : [...source]

    return {
      items,
      page: 1,
      pageSize: 100,
      total: items.length,
      totalPages: items.length ? 1 : 0
    }
  }

  dataProvider.get = async (collection, id) => {
    assert.equal(collection, COLLECTIONS.ratings)
    const rating = state.ratings.find((item) => String(item.id) === String(id)) || null
    if (!rating) return null
    if (staleGet && String(id) === '1') {
      return { ...rating, submission_key: 'concurrent-change', submission_fingerprint: 'changed' }
    }
    return { ...rating }
  }

  dataProvider.update = async (collection, id, body) => {
    assert.equal(collection, COLLECTIONS.ratings)
    const rating = state.ratings.find((item) => String(item.id) === String(id))
    assert.ok(rating)
    Object.assign(rating, body)
    updates.push({ id, body: { ...body } })
    return { ...rating }
  }

  return updates
}

test('live reconciliation dry-run identifies only structurally valid legacy ratings and performs no writes', async () => {
  const state = fixture()
  const updates = installProvider(state)

  const plan = await buildLiveRatingReconciliationPlan()
  const result = await runLiveRatingReconciliation()

  assert.equal(plan.summary.ratingsExamined, 3)
  assert.equal(plan.eligible.length, 1)
  assert.equal(plan.eligible[0].ratingId, 1)
  assert.equal(plan.plans.find((item) => item.ratingId === 2).legacyCandidate, false)
  assert.equal(plan.plans.find((item) => item.ratingId === 3).validTotal, false)
  assert.equal(result.mode, 'dry-run')
  assert.equal(result.eligible, 1)
  assert.equal(updates.length, 0)
})

test('live reconciliation apply updates only the eligible parent and a second run is idempotent', async () => {
  const state = fixture()
  const updates = installProvider(state)

  const applied = await runLiveRatingReconciliation({
    apply: true,
    confirmation: LIVE_RATING_RECONCILIATION_CONFIRMATION,
    expectedEligible: 1
  })

  assert.equal(applied.status, 'PASS')
  assert.equal(applied.applied, 1)
  assert.equal(applied.remainingEligible, 0)
  assert.equal(applied.completedRatingsBefore, 1)
  assert.equal(applied.completedRatingsAfter, 2)
  assert.equal(updates.length, 1)
  assert.equal(updates[0].id, 1)
  assert.equal(state.ratings[0].submission_state, 'complete')
  assert.equal(state.ratings[0].expected_score_count, 1)
  assert.equal(state.ratings[0].expected_bonus_count, 0)
  assert.match(state.ratings[0].submission_key, /^legacy:user-1:1$/)
  assert.match(state.ratings[0].submission_fingerprint, /^[a-f0-9]{64}$/)

  const rerun = await runLiveRatingReconciliation({
    apply: true,
    confirmation: LIVE_RATING_RECONCILIATION_CONFIRMATION,
    expectedEligible: 0
  })
  assert.equal(rerun.applied, 0)
  assert.equal(rerun.remainingEligible, 0)
  assert.equal(updates.length, 1)
})

test('live reconciliation refuses apply without the exact destructive confirmation', async () => {
  const state = fixture()
  const updates = installProvider(state)

  await assert.rejects(
    runLiveRatingReconciliation({ apply: true, confirmation: 'yes', expectedEligible: 1 }),
    /Exact live rating reconciliation confirmation is required/
  )
  assert.equal(updates.length, 0)
})

test('live reconciliation refuses apply when the eligible count differs from preflight', async () => {
  const state = fixture()
  const updates = installProvider(state)

  await assert.rejects(
    runLiveRatingReconciliation({
      apply: true,
      confirmation: LIVE_RATING_RECONCILIATION_CONFIRMATION,
      expectedEligible: 2
    }),
    /eligible rating count changed/
  )
  assert.equal(updates.length, 0)
})

test('live reconciliation fails closed when a planned legacy parent changes before update', async () => {
  const state = fixture()
  const updates = installProvider(state, { staleGet: true })

  await assert.rejects(
    runLiveRatingReconciliation({
      apply: true,
      confirmation: LIVE_RATING_RECONCILIATION_CONFIRMATION,
      expectedEligible: 1
    }),
    /changed before reconciliation/
  )
  assert.equal(updates.length, 0)
})
