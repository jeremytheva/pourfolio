import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'
import { __testables as catalogue } from '../../catalog-data-proxy.js'
import { dataProvider } from '../dataProvider.js'
import { isCompletedRating } from '../ratingHistoryRecords.js'

const original = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, original))

const product = { id: 4, product_name: 'Test beer', producer_id: null, product_category_id: null }
const ratings = [
  { id: 40, user_id: 'owner-a', product_id: 4, submission_state: 'complete', total_weighted: 4.45, total_unweighted: 4.2, deleted_at: null },
  { id: 41, user_id: 'owner-a', product_id: 4, submission_state: 'complete', total_weighted: 3.55, total_unweighted: 3.5, deleted_at: '2026-10-19 02:00:00' },
  { id: 42, user_id: 'owner-b', product_id: 4, submission_state: 'pending', total_weighted: 4.6, total_unweighted: 4.6, deleted_at: null }
]

const mockProvider = () => {
  dataProvider.get = async (collection, id) => collection === COLLECTIONS.products && String(id) === '4' ? product : null
  dataProvider.list = async () => []
  dataProvider.listPage = async (collection) => ({
    items: collection === COLLECTIONS.ratings ? ratings : [],
    page: 1,
    pageSize: 100,
    total: collection === COLLECTIONS.ratings ? ratings.length : 0,
    totalPages: collection === COLLECTIONS.ratings ? 1 : 0
  })
}

test('catalogue completion contract is the same tombstone-aware predicate used by rating history', () => {
  for (const rating of ratings) {
    assert.equal(catalogue.isCompletedRating(rating), isCompletedRating(rating))
  }
  assert.equal(catalogue.isCompletedRating(ratings[0]), true)
  assert.equal(catalogue.isCompletedRating(ratings[1]), false)
  assert.equal(catalogue.isCompletedRating(ratings[2]), false)
})

test('product community score and attribute distribution exclude timestamped deleted ratings', async () => {
  mockProvider()
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }
  }
  await catalogue.getProduct('4', response)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body.ratingSummary, { count: 1, average: 4.45 })
  assert.equal(response.body.ratingInsights.distribution.reduce((sum, bucket) => sum + bucket.count, 0), 1)
})

test('producer community and per-product statistics exclude tombstoned ratings', async () => {
  const stats = await catalogue.buildProducerRatingStats({ ratings, products: [product] })
  assert.deepEqual({
    count: stats.ratingCount,
    ratedBeers: stats.ratedBeerCount,
    weighted: stats.averageWeighted,
    unweighted: stats.averageUnweighted,
    topRatings: stats.topBeers[0]?.ratingCount
  }, {
    count: 1,
    ratedBeers: 1,
    weighted: 4.45,
    unweighted: 4.2,
    topRatings: 1
  })
  const perBeer = catalogue.buildProducerProductStats(ratings, [product])
  assert.deepEqual(perBeer, [{ productId: '4', ratingCount: 1, averageWeighted: 4.45 }])
})

test('producer provider projection also filters completed-but-tombstoned records', async () => {
  mockProvider()
  const projected = await catalogue.readProducerRatings([4])
  assert.deepEqual(projected.map(({ id }) => id), [40])
})
