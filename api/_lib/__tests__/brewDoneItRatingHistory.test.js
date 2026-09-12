import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItDeductionGame.js'

const { aggregate, completedRating, weightedValue } = __testables

const completeRating = (id, productId, total, date = '2026-09-01') => ({
  id,
  product_id: productId,
  total_weighted: total,
  submission_state: 'complete',
  date_rated: date
})

test('Brew history uses the canonical completed /5 rating contract', () => {
  assert.equal(weightedValue(5), 5)
  assert.equal(weightedValue('4.25'), 4.25)
  assert.equal(weightedValue(0), null)
  assert.equal(weightedValue(5.01), null)
  assert.equal(weightedValue(7), null)

  assert.equal(completedRating(completeRating(1, 10, 4.5)), true)
  assert.equal(completedRating({ ...completeRating(1, 10, 4.5), submission_state: 'pending' }), false)
  assert.equal(completedRating({ ...completeRating(1, 10, 4.5), submission_state: 'failed' }), false)
})

test('selector history aggregates exclude pending failed and out-of-range rating rows', () => {
  const products = new Map([
    ['10', { id: 10, producer_id: 2 }],
    ['11', { id: 11, producer_id: 2 }]
  ])
  const ratings = [
    completeRating(1, 10, 4, '2026-08-01'),
    completeRating(2, 11, 5, '2026-09-01'),
    { ...completeRating(3, 10, 4.8, '2026-09-10'), submission_state: 'pending' },
    { ...completeRating(4, 10, 4.8, '2026-09-11'), submission_state: 'failed' },
    completeRating(5, 10, 6, '2026-09-12')
  ]

  const result = aggregate(ratings, products, (product) => String(product.producer_id) === '2')
  assert.deepEqual(result, {
    available: true,
    ratingCount: 2,
    distinctBeerCount: 2,
    averageWeighted: 4.5,
    lastRatedAt: '2026-09-01'
  })
})
