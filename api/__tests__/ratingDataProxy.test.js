import assert from 'node:assert/strict'
import test from 'node:test'

import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../_lib/dataProvider.js'
import { __testables } from '../rating-data-proxy.js'

const attributes = [
  { id: 1, attribute_name: 'Design', is_scored: 0, weighting: 0 },
  { id: 2, attribute_name: 'Appearence', is_scored: 1, weighting: 0.1 },
  { id: 3, attribute_name: 'Aroma', is_scored: 1, weighting: 0.1 },
  { id: 4, attribute_name: 'Mouthfeel', is_scored: 1, weighting: 0.2 },
  { id: 5, attribute_name: 'Flavour', is_scored: 1, weighting: 0.25 },
  { id: 6, attribute_name: 'Follow', is_scored: 1, weighting: 0.25 },
  { id: 7, attribute_name: 'Bonus', is_scored: 1, weighting: 0.1 },
  { id: 8, attribute_name: 'Burp', is_scored: 0, weighting: 0 }
]

const maximumScores = [
  { attributeId: 2, score: 7 },
  { attributeId: 3, score: 7 },
  { attributeId: 4, score: 7 },
  { attributeId: 5, score: 7 },
  { attributeId: 6, score: 7 },
  { attributeId: 7, score: 2 },
  { attributeId: 1, score: 1 },
  { attributeId: 8, score: 0 }
]

const responseHarness = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
  end() { return this }
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

test('submitRating ignores browser totals and persists server-recomputed five-point totals', async () => {
  const created = []
  let nextId = 100

  await withProviderMocks({
    get: async (collection, id) => {
      if (collection === COLLECTIONS.products && String(id) === '4') return { id: 4, product_name: 'Ace', product_category_id: 10, producer_id: 20 }
      return null
    },
    list: async (collection) => {
      if (collection === COLLECTIONS.ratingAttributes) return attributes
      if (collection === COLLECTIONS.bonusAttributes) return []
      if (collection === COLLECTIONS.ratings) return [{ id: 100, total_weighted: 5 }]
      return []
    },
    create: async (collection, body) => {
      const record = { id: nextId++, ...body }
      created.push({ collection, body: record })
      return record
    },
    remove: async () => null
  }, async () => {
    const response = responseHarness()
    await __testables.submitRating({
      body: {
        productId: 4,
        total_weighted: 1,
        total_unweighted: 1,
        scores: maximumScores,
        weights: { appearance: 0.1, aroma: 0.1, mouthfeel: 0.2, flavour: 0.25, follow: 0.25, bonus: 0.1 },
        bonusAttributeIds: []
      }
    }, response, { id: 'user-1' }, 'test-request')

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.rating.total_weighted, 5)
    assert.equal(response.body.rating.total_unweighted, 5)
    assert.equal(response.body.rating.advanced_scores.score_out_of_100, 100)

    const ratingWrite = created.find((entry) => entry.collection === COLLECTIONS.ratings)
    assert.equal(ratingWrite.body.total_weighted, 5)
    assert.equal(ratingWrite.body.total_unweighted, 5)
    assert.equal(Object.hasOwn(ratingWrite.body, 'weights'), false)
    assert.equal(Object.hasOwn(ratingWrite.body, 'score_out_of_100'), false)
  })
})

test('owner history preserves exact category metadata and derives private PPP from owned cellar data', async () => {
  await withProviderMocks({
    list: async (collection, filters = {}) => {
      if (collection === COLLECTIONS.ratings && filters.user_id === 'user-1') {
        return [{ id: 99, user_id: 'user-1', product_id: 4, cellar_id: 55, date_rated: '2026-09-11T00:00:00.000Z', total_unweighted: 4, total_weighted: 4 }]
      }
      if (collection === COLLECTIONS.ratings) return [{ id: 99, total_weighted: 4 }, { id: 100, total_weighted: 5 }]
      if (collection === COLLECTIONS.cellar) return [{ id: 55, user_id: 'user-1', product_id: 4, mls: 375, purchase_price: 8, retail_price: 10 }]
      return []
    },
    get: async (collection, id) => {
      if (collection === COLLECTIONS.products && String(id) === '4') return { id: 4, product_name: 'Ace', product_category_id: 10, producer_id: 20 }
      if (collection === COLLECTIONS.producers && String(id) === '20') return { id: 20, producer_name: 'Rocky Ridge Brewing' }
      if (collection === COLLECTIONS.categories && String(id) === '10') return { id: 10, category_name: 'Pale Ale' }
      return null
    }
  }, async () => {
    const response = responseHarness()
    await __testables.listUserRatings(response, { id: 'user-1' })

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.items.length, 1)
    const item = response.body.items[0]
    assert.equal(item.product.product_category_id, 10)
    assert.deepEqual(item.product.category, { id: 10, category_name: 'Pale Ale' })
    assert.deepEqual(item.product.producer, { id: 20, producer_name: 'Rocky Ridge Brewing' })
    assert.equal(item.advanced_scores.score_out_of_100, 80)
    assert.equal(item.advanced_scores.scaled_score, 0)
    assert.equal(item.advanced_scores.retail_ppp, 136.36)
    assert.equal(item.advanced_scores.purchased_ppp, 140.71)
  })
})

test('product projection refuses mismatched producer/category identities', async () => {
  await withProviderMocks({
    get: async (collection, id) => {
      if (collection === COLLECTIONS.products) return { id: 4, product_name: 'Ace', product_category_id: 10, producer_id: 20 }
      if (collection === COLLECTIONS.producers) return { id: 21, producer_name: 'Wrong Brewery' }
      if (collection === COLLECTIONS.categories) return { id: 11, category_name: 'Wrong Style' }
      return null
    }
  }, async () => {
    const projection = await __testables.productProjection('4')
    assert.equal(projection.producer, null)
    assert.equal(projection.category, null)
    assert.equal(projection.product_category_id, 10)
    assert.equal(projection.producer_id, 20)
  })
})
