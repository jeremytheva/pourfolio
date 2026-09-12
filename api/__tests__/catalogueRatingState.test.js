import assert from 'node:assert/strict'
import test from 'node:test'

import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../_lib/dataProvider.js'
import { __testables } from '../catalog-data-proxy.js'

const responseHarness = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this }
})

const withProviderMocks = async (overrides, callback) => {
  const original = {}
  for (const [name, replacement] of Object.entries(overrides)) {
    original[name] = dataProvider[name]
    dataProvider[name] = replacement
  }
  try {
    await callback()
  } finally {
    for (const [name, value] of Object.entries(original)) dataProvider[name] = value
  }
}

test('catalogue aggregates only durable complete ratings with present five-point totals', async () => {
  let ratingFilters = null
  await withProviderMocks({
    get: async (collection, id) => {
      if (collection === COLLECTIONS.products) {
        return { id: Number(id), product_name: 'Durable Ale', producer_id: 20, product_category_id: 10 }
      }
      return null
    },
    list: async (collection, filters = {}) => {
      if (collection === COLLECTIONS.producers) return [{ id: 20, producer_name: 'Durable Brewing' }]
      if (collection === COLLECTIONS.categories) return [{ id: 10, category_name: 'Pale Ale' }]
      if (collection === COLLECTIONS.ratings) {
        ratingFilters = filters
        return [
          { id: 1, submission_state: 'complete', total_weighted: 4 },
          { id: 2, submission_state: 'complete', total_weighted: 5 },
          { id: 3, submission_state: 'pending', total_weighted: 5 },
          { id: 4, submission_state: 'failed', total_weighted: 1 },
          { id: 5, submission_state: 'complete', total_weighted: null },
          { id: 6, submission_state: 'complete', total_weighted: 6 }
        ]
      }
      if (collection === COLLECTIONS.ratingScores) return []
      if (collection === COLLECTIONS.ratingAttributes) return []
      return []
    }
  }, async () => {
    const response = responseHarness()
    await __testables.getProduct('4', response)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(ratingFilters, { product_id: 4, submission_state: 'complete' })
    assert.deepEqual(response.body.ratingSummary, { count: 2, average: 4.5 })
    assert.deepEqual(response.body.ratingInsights.distribution, [
      { score: 0, count: 0 },
      { score: 1, count: 0 },
      { score: 2, count: 0 },
      { score: 3, count: 0 },
      { score: 4, count: 1 },
      { score: 5, count: 1 }
    ])
  })
})

test('zero remains a valid complete five-point aggregate while absent totals do not', () => {
  assert.equal(__testables.ratingTotal({ total_weighted: 0 }), 0)
  assert.equal(__testables.ratingTotal({ total_weighted: null }), null)
  assert.equal(__testables.ratingTotal({ total_weighted: '' }), null)
  assert.equal(__testables.isCompletedRating({ submission_state: 'complete', total_weighted: 0 }), true)
  assert.equal(__testables.isCompletedRating({ submission_state: 'pending', total_weighted: 4 }), false)
})
