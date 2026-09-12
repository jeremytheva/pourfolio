import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItDeductionOptions.js'

const { booleanOrNull, canonicalIdOrNull, completedRating, numericOrNull, ratedProducerKnowledge } = __testables

const completeRating = (productId, total = 4.2) => ({ product_id: productId, submission_state: 'complete', total_weighted: total })

test('missing numeric catalogue values remain unknown rather than zero', () => {
  assert.equal(numericOrNull(null), null)
  assert.equal(numericOrNull(undefined), null)
  assert.equal(numericOrNull(''), null)
  assert.equal(numericOrNull('6.5'), 6.5)
})

test('missing collaboration remains unknown rather than false', () => {
  assert.equal(booleanOrNull(null), null)
  assert.equal(booleanOrNull(undefined), null)
  assert.equal(booleanOrNull(''), null)
  assert.equal(booleanOrNull(1), true)
  assert.equal(booleanOrNull('1'), true)
  assert.equal(booleanOrNull(0), false)
  assert.equal(booleanOrNull('0'), false)
  assert.equal(booleanOrNull('unexpected'), null)
})

test('catalogue relationship identifiers normalize to positive-id strings', () => {
  assert.equal(canonicalIdOrNull(null), null)
  assert.equal(canonicalIdOrNull(''), null)
  assert.equal(canonicalIdOrNull(0), null)
  assert.equal(canonicalIdOrNull('0'), null)
  assert.equal(canonicalIdOrNull(12), '12')
  assert.equal(canonicalIdOrNull('12'), '12')
})

test('only durable complete ratings with canonical /5 totals count as familiarity', () => {
  assert.equal(completedRating(completeRating(1, 5)), true)
  assert.equal(completedRating(completeRating(1, 0)), false)
  assert.equal(completedRating(completeRating(1, 5.1)), false)
  assert.equal(completedRating({ ...completeRating(1), submission_state: 'pending' }), false)
  assert.equal(completedRating({ ...completeRating(1), submission_state: 'failed' }), false)
})

test('previous-rating brewery knowledge is incomplete when a completed rated beer lacks governed producer attribution', () => {
  const products = new Map([
    ['1', { id: 1, producer_id: 10 }],
    ['2', { id: 2, producer_id: 0 }]
  ])
  const result = ratedProducerKnowledge([
    completeRating(1),
    completeRating(2),
    completeRating(999),
    { product_id: 1, submission_state: 'pending', total_weighted: 4.9 },
    { product_id: 2, submission_state: 'complete', total_weighted: 6 }
  ], products)

  assert.deepEqual([...result.producerIds], ['10'])
  assert.equal(result.complete, false)
})

test('previous-rating brewery knowledge is complete when every accepted rating has governed attribution', () => {
  const products = new Map([
    ['1', { id: 1, producer_id: 10 }],
    ['2', { id: 2, producer_id: 20 }]
  ])
  const result = ratedProducerKnowledge([
    completeRating(1),
    completeRating(2, 5),
    { product_id: 999, submission_state: 'failed', total_weighted: 4 }
  ], products)
  assert.deepEqual([...result.producerIds], ['10', '20'])
  assert.equal(result.complete, true)
})
