import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RATING_DISTRIBUTION_BUCKETS,
  buildCompletedRatingDistribution,
  completedRatingTotal,
  distributionBucketForRating
} from './completedRatingContract.js'

test('completed rating totals are greater than zero and at most five', () => {
  assert.equal(completedRatingTotal(0), null)
  assert.equal(completedRatingTotal(-0.01), null)
  assert.equal(completedRatingTotal(null), null)
  assert.equal(completedRatingTotal(''), null)
  assert.equal(completedRatingTotal(Number.NaN), null)
  assert.equal(completedRatingTotal(0.01), 0.01)
  assert.equal(completedRatingTotal('4.76'), 4.76)
  assert.equal(completedRatingTotal(5), 5)
  assert.equal(completedRatingTotal(5.01), null)
})

test('distribution uses ten explicit half-point ranges without integer rounding', () => {
  assert.equal(RATING_DISTRIBUTION_BUCKETS.length, 10)
  assert.deepEqual(RATING_DISTRIBUTION_BUCKETS[0], {
    key: '0.0-0.5', label: '>0–0.5', minExclusive: 0, maxInclusive: 0.5
  })
  assert.deepEqual(RATING_DISTRIBUTION_BUCKETS.at(-1), {
    key: '4.5-5.0', label: '4.5–5.0', minExclusive: 4.5, maxInclusive: 5
  })
  assert.equal(distributionBucketForRating(0.01).key, '0.0-0.5')
  assert.equal(distributionBucketForRating(0.5).key, '0.0-0.5')
  assert.equal(distributionBucketForRating(0.51).key, '0.5-1.0')
  assert.equal(distributionBucketForRating(4.76).key, '4.5-5.0')
  assert.equal(distributionBucketForRating(5).key, '4.5-5.0')
  assert.equal(distributionBucketForRating(0), null)
})

test('distribution conserves every valid decimal rating exactly once', () => {
  const values = [0, 0.01, 0.49, 0.5, 0.51, 1, 1.01, 2.37, 4.49, 4.5, 4.51, 4.76, 5, 5.01, null, '']
  const distribution = buildCompletedRatingDistribution(values)
  const accepted = values.filter((value) => completedRatingTotal(value) !== null)
  assert.equal(distribution.reduce((sum, bucket) => sum + bucket.count, 0), accepted.length)
  assert.equal(distribution.find((bucket) => bucket.key === '4.5-5.0').count, 3)
})
