import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyCompletedRatings } from '../audit-live-rating-integrity.js'
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
