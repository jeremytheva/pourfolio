import assert from 'node:assert/strict'
import test from 'node:test'
import { buildUserProductRatingSummary } from '../userRatingSummary.js'

test('summarises only valid completed owner ratings for the requested product', () => {
  const result = buildUserProductRatingSummary({ items: [
    { product_id: 12, total_weighted: 5 },
    { product_id: '12', total_weighted: '4' },
    { product_id: 13, total_weighted: 5 },
    { product_id: 12, total_weighted: 0 },
    { product_id: 12, total_weighted: 8 },
    { product_id: 12, total_weighted: 'invalid' }
  ] }, '12')
  assert.deepEqual(result, { count: 2, average: 4.5 })
  assert.equal(Object.isFrozen(result), true)
})

test('returns null for unavailable history or absent/non-completed scores', () => {
  assert.equal(buildUserProductRatingSummary(null, 12), null)
  assert.equal(buildUserProductRatingSummary({ items: [] }, 12), null)
  assert.equal(buildUserProductRatingSummary({ items: [{ product_id: 12, total_weighted: null }] }, 12), null)
  assert.equal(buildUserProductRatingSummary({ items: [{ product_id: 12, total_weighted: '' }] }, 12), null)
  assert.equal(buildUserProductRatingSummary({ items: [{ product_id: 12, total_weighted: 0 }] }, 12), null)
})
