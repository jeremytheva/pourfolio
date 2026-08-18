import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../data-proxy.js'

const originalProviderMethods = { ...dataProvider }

afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
})

const createResponse = () => ({
  body: null,
  statusCode: null,
  status(statusCode) {
    this.statusCode = statusCode
    return this
  },
  json(body) {
    this.body = body
    return this
  }
})

const getProductWithRatings = async (ratings) => {
  dataProvider.get = async (collection, id) => {
    assert.equal(collection, COLLECTIONS.products)
    return { id, product_name: 'Aggregate Ale', producer_id: 7, product_category_id: 8 }
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.ratings) {
      assert.deepEqual(filters, {
        product_id: '42',
        submission_state: 'complete',
        fields: 'total_weighted,submission_state'
      })
      return ratings
    }
    if (collection === COLLECTIONS.producers) return [{ id: 7, producer_name: 'Test Brewery' }]
    if (collection === COLLECTIONS.categories) return [{ id: 8, category_name: 'Test Beer' }]
    assert.fail(`Unexpected collection: ${collection}`)
  }

  const response = createResponse()
  await __testables.getProduct('42', response)
  assert.equal(response.statusCode, 200)
  return response.body
}

test('product details return an empty rating aggregate without rating records', async () => {
  const product = await getProductWithRatings([])

  assert.deepEqual(product, {
    id: '42',
    product_name: 'Aggregate Ale',
    product_category_id: 8,
    producer_id: 7,
    producer: { id: 7, producer_name: 'Test Brewery' },
    category: { id: 8, category_name: 'Test Beer' },
    ratingSummary: { count: 0, average: null },
    ratings: []
  })
})

test('product details return the aggregate for one rating only', async () => {
  const product = await getProductWithRatings([{
    id: 'rating-record-id',
    rating_id: 'submission-id',
    cellar_id: 'cellar-id',
    date_rated: '2026-07-28',
    submission_state: 'complete',
    total_weighted: 6.25,
    scores: [1, 7]
  }])

  assert.deepEqual(product.ratingSummary, { count: 1, average: 6.25 })
  assert.equal(JSON.stringify(product).includes('rating-record-id'), false)
  assert.equal(JSON.stringify(product).includes('submission-id'), false)
  assert.equal(JSON.stringify(product).includes('cellar-id'), false)
  assert.equal(JSON.stringify(product).includes('2026-07-28'), false)
  assert.equal(JSON.stringify(product).includes('"scores"'), false)
  assert.deepEqual(product.ratings, [])
})

test('product details average multiple finite totals and ignore untrusted non-finite totals', async () => {
  const product = await getProductWithRatings([
    { submission_state: 'complete', total_weighted: 3.111 },
    { submission_state: 'complete', total_weighted: 6.222 },
    { submission_state: 'complete', total_weighted: 'not-a-number' },
    { submission_state: 'complete', total_weighted: Number.POSITIVE_INFINITY },
    { submission_state: 'complete', total_weighted: null },
    { submission_state: 'pending', total_weighted: 7 },
    { submission_state: 'failed', total_weighted: 1 }
  ])

  assert.deepEqual(product.ratingSummary, { count: 2, average: 4.67 })
  assert.deepEqual(Object.keys(product).filter((key) => /rating|cellar|score|date/i.test(key)), ['ratingSummary', 'ratings'])
})

test('product details reject a non-canonical route identifier before provider access', async () => {
  dataProvider.get = async () => assert.fail('an invalid route identifier must not reach the provider')
  const response = createResponse()

  await assert.rejects(__testables.getProduct(' 42 ', response), (error) => {
    assert.equal(error.status, 400)
    assert.equal(error.message, 'Product identifier is invalid.')
    return true
  })
  assert.equal(response.statusCode, null)
})

test('product details return not found for an exact missing identifier', async () => {
  dataProvider.get = async (collection, id) => {
    assert.equal(collection, COLLECTIONS.products)
    assert.equal(id, '42')
    return null
  }
  const response = createResponse()

  await __testables.getProduct('42', response)

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.body, { error: 'Product not found.' })
})

test('product details fail closed when a provider returns a different product identity', async () => {
  dataProvider.get = async (collection, id) => {
    assert.equal(collection, COLLECTIONS.products)
    assert.equal(id, '42')
    return { id: 43, product_name: 'Wrong product' }
  }
  dataProvider.list = async () => assert.fail('a mismatched product must not hydrate or load ratings')
  const response = createResponse()

  await assert.rejects(__testables.getProduct('42', response), (error) => {
    assert.equal(error.status, 502)
    assert.equal(error.code, 'PROVIDER_ERROR')
    assert.doesNotMatch(error.message, /wrong product/i)
    return true
  })
  assert.equal(response.statusCode, null)
})