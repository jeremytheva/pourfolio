import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const original = {
  list: dataProvider.list,
  get: dataProvider.get,
  create: dataProvider.create,
  remove: dataProvider.remove
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

const category = { id: 10, category_name: 'Pale Ale' }
const primary = { id: 20, user_id: 'owner-a', producer_name: 'Primary Brewing' }
const collaborator = { id: 21, user_id: 'owner-b', producer_name: 'Collab Brewing' }

test('multi producer product writes canonical relationships and mirrors the primary producer', async () => {
  const creates = []
  const relationshipRows = []
  const persistedProduct = {
    id: 201,
    user_id: 'session-owner',
    product_name: 'Together Ale',
    product_category_id: 10,
    producer_id: 20,
    abv: 6.1,
    ibu: '40',
    declared_category: 'Pale Ale',
    edition: null,
    collaboration: 1,
    product_image: null
  }

  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.categories) return category
    if (collection === COLLECTIONS.producers && String(id) === '20') return primary
    if (collection === COLLECTIONS.producers && String(id) === '21') return collaborator
    if (collection === COLLECTIONS.products && String(id) === '201') return persistedProduct
    return null
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.products && filters.producer_id === '20') return []
    if (collection === COLLECTIONS.productProducers) return relationshipRows
    if (collection === COLLECTIONS.producers && filters['id[in]']) return [primary, collaborator]
    if (collection === COLLECTIONS.categories && filters['id[in]']) return [category]
    return []
  }
  dataProvider.create = async (collection, payload) => {
    creates.push({ collection, payload })
    if (collection === COLLECTIONS.products) return { id: 201 }
    if (collection === COLLECTIONS.productProducers) {
      const row = { id: 300 + relationshipRows.length, ...payload }
      relationshipRows.push(row)
      return row
    }
    return null
  }

  const { response, result } = responseRecorder()
  await __testables.createProduct({
    body: {
      product_name: 'Together Ale',
      product_category_id: 10,
      producer_id: 20,
      producers: [{ producer_id: 20 }, { producer_id: 21 }],
      abv: 6.1,
      ibu: 40,
      collaboration: true
    }
  }, response, { id: 'session-owner' })

  assert.equal(result.statusCode, 201)
  assert.equal(result.body.product.producer.id, 20)
  assert.deepEqual(result.body.product.producers.map((producer) => producer.id), [20, 21])
  assert.equal(result.body.product.collaboration, 1)
  assert.equal(result.body.producersCreated, 0)

  const productWrite = creates.find(({ collection }) => collection === COLLECTIONS.products)
  assert.equal(productWrite.payload.producer_id, '20')
  assert.equal(productWrite.payload.collaboration, 1)
  assert.deepEqual(relationshipRows.map(({ product_id, producer_id, is_primary, sort_order }) => ({ product_id, producer_id, is_primary, sort_order })), [
    { product_id: '201', producer_id: '20', is_primary: 1, sort_order: 1 },
    { product_id: '201', producer_id: '21', is_primary: 0, sort_order: 2 }
  ])
})

test('product hydration falls back to products.producer_id when relationship rows are absent', async () => {
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.productProducers) return []
    if (collection === COLLECTIONS.producers && filters['id[in]']) return [primary]
    if (collection === COLLECTIONS.categories && filters['id[in]']) return [category]
    return []
  }

  const [result] = await __testables.hydrateProducts([{
    id: 50,
    product_name: 'Legacy Beer',
    product_category_id: 10,
    producer_id: 20,
    collaboration: 0
  }])

  assert.equal(result.producer.id, 20)
  assert.deepEqual(result.producers.map((producer) => producer.id), [20])
})

test('product hydration fails closed when the authoritative relationship read fails', async () => {
  const providerError = Object.assign(new Error('provider unavailable'), { status: 503, code: 'PROVIDER_ERROR' })
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.productProducers) throw providerError
    return []
  }

  await assert.rejects(
    __testables.hydrateProducts([{
      id: 51,
      product_name: 'Legacy Looking Beer',
      product_category_id: 10,
      producer_id: 20,
      collaboration: 0
    }]),
    (error) => error === providerError
  )
})
