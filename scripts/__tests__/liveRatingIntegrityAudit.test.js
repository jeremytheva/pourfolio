import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyCompletedRatings, summariseContradictoryDeleteChildren } from '../audit-live-rating-integrity.js'
import { isCompletedRating } from '../../api/_lib/ratingHistoryRecords.js'

test('live audit completion set uses the exact owner-history visibility predicate', () => {
  const rows = [
    { id: 1, user_id: 'owner-a', submission_state: 'complete', total_weighted: 4.2, deleted_at: null },
    { id: 2, user_id: 'owner-a', submission_state: 'complete', total_weighted: 3.5, deleted_at: '2026-10-19 02:00:00' },
    { id: 3, user_id: 'owner-a', submission_state: 'deleted', total_weighted: 4.8, deleted_at: '2026-10-19 02:01:00' },
    { id: 4, user_id: 'owner-a', submission_state: 'pending', total_weighted: 3.1, deleted_at: null },
    { id: 5, user_id: 'owner-b', submission_state: 'complete', total_weighted: 4.4, deleted_at: null },
    { id: 6, user_id: 'owner-b', submission_state: 'complete', total_weighted: null, deleted_at: null }
  ]
  const classified = classifyCompletedRatings(rows)
  assert.deepEqual(classified.completed.map(({ id }) => id), [1, 5])
  assert.equal(classified.contradictoryCompletionCount, 1)
  assert.deepEqual(classified.completed, rows.filter(isCompletedRating))
})

test('live audit records contradictory completed and timestamped rows without exposing identifiers', () => {
  const classified = classifyCompletedRatings([
    { id: 9001, user_id: 'private-account', submission_state: 'complete', total_weighted: 4, deleted_at: '2026-10-19 02:00:00' },
    { id: 9002, user_id: 'private-account', submission_state: 'complete', total_weighted: 4, deleted_at: '2026-10-19 02:00:01' }
  ])
  assert.equal(classified.contradictoryCompletionCount, 2)
  assert.deepEqual(classified.completed, [])
})

test('unmarked complete ratings remain in both history and live audit eligibility', () => {
  const rows = [{ id: 1, submission_state: 'complete', total_weighted: 0.1, deleted_at: null }]
  const result = classifyCompletedRatings(rows)
  assert.equal(result.contradictoryCompletionCount, 0)
  assert.deepEqual(result.completed, rows.filter(isCompletedRating))
})

test('completion audit rejects invalid totals and preserves the exact empty-timestamp contract', () => {
  const rows = [
    { id: 10, submission_state: 'complete', total_weighted: 0, deleted_at: null },
    { id: 11, submission_state: 'complete', total_weighted: 5.5, deleted_at: null },
    { id: 12, submission_state: 'complete', total_weighted: '4.25', deleted_at: '' }
  ]
  const result = classifyCompletedRatings(rows)
  assert.deepEqual(result.completed.map(({ id }) => id), [12])
  assert.equal(result.contradictoryCompletionCount, 0)
})

test('deleted timestamp excludes a complete row even when its recorded weighted score is otherwise valid', () => {
  const records = [
    { id: 40, submission_state: 'complete', total_weighted: '4.45', deleted_at: null },
    { id: 41, submission_state: 'complete', total_weighted: '3.55', deleted_at: '2026-10-19 02:20:00' }
  ]
  const classified = classifyCompletedRatings(records)
  assert.equal(classified.completed.length, 1)
  assert.equal(classified.completed[0].id, 40)
  assert.equal(classified.contradictoryCompletionCount, 1)
})

test('read-only delete diagnosis proves child absence without disclosing private identifiers', () => {
  const summary = summariseContradictoryDeleteChildren({
    ratings: [
      { id: 77, user_id: 'private-owner', submission_state: 'complete', deleted_at: '2026-10-19 02:00:00' },
      { id: 78, user_id: 'another-user', submission_state: 'complete', deleted_at: null }
    ],
    scores: [{ id: 20, user_id: 'another-user', rating_id: 78 }],
    bonuses: [{ id: 50, user_id: 'another-user', rating_id: 78 }]
  })
  assert.deepEqual(summary, {
    contradictoryRows: 1,
    withScores: 0,
    withBonuses: 0,
    withAnyChildren: 0,
    withoutChildren: 1,
    scoreChildrenRemaining: 0,
    bonusChildrenRemaining: 0,
    mismatchedChildOwners: 0,
    childrenWithoutOwner: 0
  })
  assert.equal(JSON.stringify(summary).includes('private-owner'), false)
  assert.equal(JSON.stringify(summary).includes('77'), false)
})

test('read-only diagnosis counts surviving score/bonus children on an inconsistent tombstone', () => {
  const summary = summariseContradictoryDeleteChildren({
    ratings: [{ id: 77, user_id: 'owner-a', submission_state: 'complete', deleted_at: '2026-10-19 02:00:00' }],
    scores: [
      { id: 21, rating_id: '77', user_id: 'owner-a' },
      { id: 22, rating_id: 77, user_id: 'owner-a' }
    ],
    bonuses: [{ id: 23, rating_id: 77, user_id: 'owner-a' }]
  })
  assert.equal(summary.withScores, 1)
  assert.equal(summary.withBonuses, 1)
  assert.equal(summary.withAnyChildren, 1)
  assert.equal(summary.withoutChildren, 0)
  assert.equal(summary.scoreChildrenRemaining, 2)
  assert.equal(summary.bonusChildrenRemaining, 1)
})

test('read-only diagnosis counts cross-owner and missing-owner child anomalies without leaking identities', () => {
  const summary = summariseContradictoryDeleteChildren({
    ratings: [
      { id: 9, user_id: 'owner-a', submission_state: 'complete', deleted_at: '2026-10-19 02:00:00' },
      { id: 10, user_id: 'owner-b', submission_state: 'complete', deleted_at: '2026-10-19 02:01:00' }
    ],
    scores: [
      { id: 1, rating_id: 9, user_id: 'owner-b' },
      { id: 2, rating_id: 10, user_id: null }
    ],
    bonuses: [{ id: 3, rating_id: 10, user_id: 'owner-b' }]
  })
  assert.equal(summary.contradictoryRows, 2)
  assert.equal(summary.withAnyChildren, 2)
  assert.equal(summary.mismatchedChildOwners, 1)
  assert.equal(summary.childrenWithoutOwner, 1)
  assert.equal(JSON.stringify(summary).includes('owner-a'), false)
  assert.equal(JSON.stringify(summary).includes('owner-b'), false)
})

test('read-only diagnosis is zeroed when there are no contradictory parents', () => {
  const result = summariseContradictoryDeleteChildren({
    ratings: [{ id: 4, user_id: 'owner-a', submission_state: 'deleted', deleted_at: '2026-10-19 02:01:00' }],
    scores: [], bonuses: []
  })
  assert.equal(result.contradictoryRows, 0)
  assert.equal(result.withoutChildren, 0)
  assert.equal(result.withAnyChildren, 0)
})
