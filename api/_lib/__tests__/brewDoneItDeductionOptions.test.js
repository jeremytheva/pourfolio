import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItDeductionOptions.js'

const { booleanOrNull, canonicalIdOrNull, numericOrNull, ratedProducerKnowledge } = __testables

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

test('previous-rating brewery knowledge is incomplete when a rated beer lacks governed producer attribution', () => {
  const products = new Map([
    ['1', { id: 1, producer_id: 10 }],
    ['2', { id: 2, producer_id: 0 }]
  ])
  const result = ratedProducerKnowledge([
    { product_id: 1 },
    { product_id: 2 },
    { product_id: 999 }
  ], products)

  assert.deepEqual([...result.producerIds], ['10'])
  assert.equal(result.complete, false)
})

test('previous-rating brewery knowledge is complete when every rated beer has governed attribution', () => {
  const products = new Map([
    ['1', { id: 1, producer_id: 10 }],
    ['2', { id: 2, producer_id: 20 }]
  ])
  const result = ratedProducerKnowledge([{ product_id: 1 }, { product_id: 2 }], products)
  assert.deepEqual([...result.producerIds], ['10', '20'])
  assert.equal(result.complete, true)
})
