import assert from 'node:assert/strict'
import test from 'node:test'

import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const original = {
  list: dataProvider.list,
  listPage: dataProvider.listPage,
  get: dataProvider.get
}

test.afterEach(() => Object.assign(dataProvider, original))

const responseRecorder = () => {
  const result = { statusCode: null, body: null }
  return {
    result,
    response: {
      status(code) { result.statusCode = code; return this },
      json(body) { result.body = body; return this }
    }
  }
}

const producer = { id: 20, producer_name: 'Primary Brewing', address: '', suburb_id: null }
const collaborator = { id: 21, producer_name: 'Collab Brewing', address: '', suburb_id: null }
const category = { id: 10, category_name: 'Pale Ale', parent_id: null }
const products = [
  { id: 101, product_name: 'Together Ale', product_category_id: 10, producer_id: 20, collaboration: 1 },
  { id: 102, product_name: 'Legacy Ale', product_category_id: 10, producer_id: 20, collaboration: 0 }
]
const relationships = [
  { id: 1, product_id: 101, producer_id: 20, is_primary: 1, sort_order: 1 },
  { id: 2, product_id: 101, producer_id: 21, is_primary: 0, sort_order: 2 }
]
const ratings = [
  { id: 1, user_id: 'me', product_id: 101, submission_state: 'complete', total_weighted: 4.5, total_unweighted: 4.4 },
  { id: 2, user_id: 'other', product_id: 101, submission_state: 'complete', total_weighted: 4, total_unweighted: 3.8 },
  { id: 3, user_id: 'other', product_id: 102, submission_state: 'complete', total_weighted: 3.5, total_unweighted: 3.6 },
  { id: 4, user_id: 'me', product_id: 102, submission_state: 'draft', total_weighted: 5, total_unweighted: 5 },
  { id: 5, user_id: 'other', product_id: 102, submission_state: 'complete', total_weighted: 0, total_unweighted: 4 }
]
const attributes = [
  { id: 2, attribute_name: 'Appearance' },
  { id: 3, attribute_name: 'Aroma' },
  { id: 8, attribute_name: 'Design' },
  { id: 9, attribute_name: 'Burp' }
]
const scores = [
  { id: 1, rating_id: 1, attribute_id: 2, attribute_score: 5 },
  { id: 2, rating_id: 1, attribute_id: 3, attribute_score: 6 },
  { id: 3, rating_id: 1, attribute_id: 8, attribute_score: 7 },
  { id: 4, rating_id: 1, attribute_id: 9, attribute_score: 1 },
  { id: 5, rating_id: 2, attribute_id: 2, attribute_score: 4 },
  { id: 6, rating_id: 2, attribute_id: 3, attribute_score: 5 },
  { id: 7, rating_id: 3, attribute_id: 2, attribute_score: 3 }
]

const page = (items, limit = 100) => ({ items, page: 1, pageSize: limit, total: items.length, totalPages: items.length ? 1 : 0 })
const ids = (value) => new Set(String(value || '').split(',').filter(Boolean))

const installProvider = () => {
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.producers && String(id) === '20') return producer
    return null
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.productProducers) {
      if (filters.producer_id) return relationships.filter((row) => String(row.producer_id) === String(filters.producer_id))
      const productIds = ids(filters['product_id[in]'])
      return relationships.filter((row) => productIds.has(String(row.product_id)))
    }
    if (collection === COLLECTIONS.producers && filters['id[in]']) {
      const producerIds = ids(filters['id[in]'])
      return [producer, collaborator].filter((row) => producerIds.has(String(row.id)))
    }
    if (collection === COLLECTIONS.categories && filters['id[in]']) return [category]
    if (collection === COLLECTIONS.ratingAttributes) return attributes
    return []
  }
  dataProvider.listPage = async (collection, { filters = {}, limit = 100 } = {}) => {
    if (collection === COLLECTIONS.products) {
      if (filters.producer_id) return page(products.filter((row) => String(row.producer_id) === String(filters.producer_id)), limit)
      if (filters['id[in]']) {
        const productIds = ids(filters['id[in]'])
        return page(products.filter((row) => productIds.has(String(row.id))), limit)
      }
    }
    if (collection === COLLECTIONS.productProducers) {
      if (filters.producer_id) return page(relationships.filter((row) => String(row.producer_id) === String(filters.producer_id)), limit)
      const productIds = ids(filters['product_id[in]'])
      return page(relationships.filter((row) => productIds.has(String(row.product_id))), limit)
    }
    if (collection === COLLECTIONS.ratings) {
      const productIds = ids(filters['product_id[in]'])
      return page(ratings.filter((row) => productIds.has(String(row.product_id))), limit)
    }
    if (collection === COLLECTIONS.ratingScores) {
      const ratingIds = ids(filters['rating_id[in]'])
      return page(scores.filter((row) => ratingIds.has(String(row.rating_id))), limit)
    }
    return page([], limit)
  }
}

test('producer profile returns aggregate community statistics and owner-scoped personal history', async () => {
  installProvider()
  const { response, result } = responseRecorder()
  await __testables.getProducer('20', response, { id: 'me' })

  assert.equal(result.statusCode, 200)
  assert.equal(result.body.communityStats.catalogueBeerCount, 2)
  assert.equal(result.body.communityStats.ratingCount, 3)
  assert.equal(result.body.communityStats.ratedBeerCount, 2)
  assert.equal(result.body.communityStats.averageWeighted, 4)
  assert.equal(result.body.communityStats.averageUnweighted, 3.93)
  assert.equal(result.body.communityStats.unweightedRatingCount, 3)
  assert.deepEqual(result.body.communityStats.attributes.map(({ name, average, count }) => ({ name, average, count })), [
    { name: 'Appearance', average: 4, count: 3 },
    { name: 'Aroma', average: 5.5, count: 2 }
  ])
  assert.deepEqual(result.body.communityStats.topBeers, [
    { productId: '101', productName: 'Together Ale', averageWeighted: 4.25, ratingCount: 2 },
    { productId: '102', productName: 'Legacy Ale', averageWeighted: 3.5, ratingCount: 1 }
  ])

  assert.deepEqual(result.body.personalStats, {
    ratingCount: 1,
    ratedBeerCount: 1,
    averageWeighted: 4.5,
    averageUnweighted: 4.4,
    unweightedRatingCount: 1,
    topBeers: [{ productId: '101', productName: 'Together Ale', averageWeighted: 4.5, ratingCount: 1 }]
  })
  assert.deepEqual(result.body.productStats, [
    {
      productId: '101',
      community: { ratingCount: 2, averageWeighted: 4.25 },
      personal: { ratingCount: 1, averageWeighted: 4.5 }
    },
    {
      productId: '102',
      community: { ratingCount: 1, averageWeighted: 3.5 },
      personal: { ratingCount: 0, averageWeighted: null }
    }
  ])

  assert.equal(JSON.stringify(result.body).includes('"user_id"'), false)
  assert.equal(JSON.stringify(result.body).includes('"rating_id"'), false)
})

test('collaboration producer receives the canonical collaboration beer without inheriting legacy-only products', async () => {
  installProvider()
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.producers && String(id) === '21') return collaborator
    return null
  }

  const { response, result } = responseRecorder()
  await __testables.getProducer('21', response, { id: 'me' })

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body.products.map((item) => item.id), [101])
  assert.equal(result.body.communityStats.catalogueBeerCount, 1)
  assert.equal(result.body.communityStats.ratingCount, 2)
  assert.equal(result.body.personalStats.ratingCount, 1)
})

test('non-scoring Design and Burp never enter the brewery core attribute profile', async () => {
  installProvider()
  const result = await __testables.buildCoreAttributeStats(ratings.slice(0, 3))
  assert.deepEqual(result.map((item) => item.name), ['Appearance', 'Aroma'])
})
