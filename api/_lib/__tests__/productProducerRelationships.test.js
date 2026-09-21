import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildProductProducerRows,
  sanitiseProductProducerInputs
} from '../productProducerRelationships.js'

const legacyExisting = { producer_id: '20', new_producer: null }
const legacyNew = { producer_id: null, new_producer: { producer_name: 'New Brewing' } }

test('accepts one or more producer relationships with the first producer as primary', () => {
  assert.deepEqual(sanitiseProductProducerInputs({
    producers: [
      { producer_id: 20 },
      { producer_id: 21 },
      { new_producer: { producer_name: ' Third   Brewing ' } }
    ]
  }, legacyExisting), [
    { producer_id: '20' },
    { producer_id: '21' },
    { new_producer: { producer_name: 'Third Brewing' } }
  ])
})

test('requires the relationship primary to match the compatibility producer field', () => {
  assert.throws(() => sanitiseProductProducerInputs({ producers: [{ producer_id: 21 }] }, legacyExisting), /primary producer/i)
  assert.deepEqual(
    sanitiseProductProducerInputs({ producers: [{ new_producer: { producer_name: ' new   brewing ' } }] }, legacyNew),
    [{ new_producer: { producer_name: 'new brewing' } }]
  )
})

test('rejects duplicate producers and browser-owned relationship metadata', () => {
  assert.throws(() => sanitiseProductProducerInputs({
    producers: [{ producer_id: 20 }, { producer_id: 20 }]
  }, legacyExisting), /same producer/i)
  assert.throws(() => sanitiseProductProducerInputs({
    producers: [{ producer_id: 20, is_primary: 1 }]
  }, legacyExisting), /unsupported fields/i)
})

test('builds server-owned relationship rows in display order', () => {
  assert.deepEqual(buildProductProducerRows('100', ['20', '21', '22']), [
    { product_id: '100', producer_id: '20', is_primary: 1, sort_order: 1 },
    { product_id: '100', producer_id: '21', is_primary: 0, sort_order: 2 },
    { product_id: '100', producer_id: '22', is_primary: 0, sort_order: 3 }
  ])
})
