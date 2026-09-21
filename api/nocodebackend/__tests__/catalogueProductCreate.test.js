import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const original = {
  list: dataProvider.list,
  get: dataProvider.get,
  create: dataProvider.create
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
const producer = { id: 20, user_id: 'other-owner', producer_name: 'Existing Brewing' }

const baseBody = {
  product_name: 'Launch Ale',
  product_category_id: 10,
  producer_id: 20,
  abv: 5.2,
  ibu: 35,
  declared_category: 'Pale Ale',
  edition: '2026',
  collaboration: false,
  product_image: null,
  user_id: 'browser-forged-owner'
}

test('product create verifies an existing producer and writes the session owner', async () => {
  const creates = []
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.categories) return category
    if (collection === COLLECTIONS.producers) return producer
    if (collection === COLLECTIONS.products && String(id) === '101') {
      return {
        id: 101,
        user_id: 'session-owner',
        product_name: 'Launch Ale',
        product_category_id: 10,
        producer_id: 20,
        abv: 5.2,
        ibu: '35',
        declared_category: 'Pale Ale',
        edition: '2026',
        collaboration: 0,
        product_image: null
      }
    }
    return null
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.products) {
      assert.deepEqual(filters, { producer_id: '20' })
      return []
    }
    if (collection === COLLECTIONS.productProducers) return []
    if (collection === COLLECTIONS.producers && filters['id[in]']) return [producer]
    if (collection === COLLECTIONS.categories && filters['id[in]']) return [category]
    return []
  }
  dataProvider.create = async (collection, payload) => {
    creates.push({ collection, payload })
    return { id: 101 }
  }

  const { response, result } = responseRecorder()
  await __testables.createProduct({ body: baseBody }, response, { id: 'session-owner' })

  assert.equal(result.statusCode, 201)
  assert.equal(result.body.product.id, 101)
  assert.equal(result.body.product.producer.producer_name, 'Existing Brewing')
  assert.equal(result.body.producerCreated, false)
  assert.equal(creates.length, 1)
  assert.equal(creates[0].collection, COLLECTIONS.products)
  assert.equal(creates[0].payload.user_id, 'session-owner')
  assert.equal(creates[0].payload.producer_id, '20')
  assert.equal(creates[0].payload.product_category_id, '10')
  assert.equal(creates[0].payload.user_id === baseBody.user_id, false)
})

test('new producer is created once and its persisted id becomes the product relationship', async () => {
  const creates = []
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.categories) return category
    if (collection === COLLECTIONS.producers && String(id) === '30') {
      return { id: 30, user_id: 'session-owner', producer_name: 'Brand New Brewing' }
    }
    if (collection === COLLECTIONS.products && String(id) === '102') {
      return {
        id: 102,
        user_id: 'session-owner',
        product_name: 'Launch Ale',
        product_category_id: 10,
        producer_id: 30,
        collaboration: 0
      }
    }
    return null
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.producers) return []
    if (collection === COLLECTIONS.products) {
      assert.deepEqual(filters, { producer_id: '30' })
      return []
    }
    return []
  }
  dataProvider.create = async (collection, payload) => {
    creates.push({ collection, payload })
    if (collection === COLLECTIONS.producers) return { id: 30 }
    if (collection === COLLECTIONS.products) return { id: 102 }
    return null
  }

  const { response, result } = responseRecorder()
  await __testables.createProduct({
    body: {
      ...baseBody,
      producer_id: undefined,
      new_producer: { producer_name: '  Brand New   Brewing ' }
    }
  }, response, { id: 'session-owner' })

  assert.equal(result.statusCode, 201)
  assert.equal(result.body.producerCreated, true)
  assert.deepEqual(creates[0], {
    collection: COLLECTIONS.producers,
    payload: { user_id: 'session-owner', producer_name: 'Brand New Brewing' }
  })
  assert.equal(creates[1].collection, COLLECTIONS.products)
  assert.equal(creates[1].payload.user_id, 'session-owner')
  assert.equal(creates[1].payload.producer_id, '30')
})

test('typed producer name reuses a normalized exact producer instead of creating a duplicate', async () => {
  const creates = []
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.categories) return category
    if (collection === COLLECTIONS.products && String(id) === '103') {
      return { id: 103, user_id: 'session-owner', product_name: 'Launch Ale', product_category_id: 10, producer_id: 20 }
    }
    return null
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.producers) return [producer]
    if (collection === COLLECTIONS.products) {
      assert.deepEqual(filters, { producer_id: '20' })
      return []
    }
    return []
  }
  dataProvider.create = async (collection, payload) => {
    creates.push({ collection, payload })
    return { id: 103 }
  }

  const { response, result } = responseRecorder()
  await __testables.createProduct({
    body: {
      ...baseBody,
      producer_id: undefined,
      new_producer: { producer_name: ' existing   brewing ' }
    }
  }, response, { id: 'session-owner' })

  assert.equal(result.statusCode, 201)
  assert.equal(result.body.producerCreated, false)
  assert.equal(creates.length, 1)
  assert.equal(creates[0].collection, COLLECTIONS.products)
  assert.equal(creates[0].payload.producer_id, '20')
})

test('exact producer-style-name-edition duplicate fails before any product write', async () => {
  let creates = 0
  dataProvider.get = async (collection) => {
    if (collection === COLLECTIONS.categories) return category
    if (collection === COLLECTIONS.producers) return producer
    return null
  }
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.products) {
      return [{
        id: 77,
        product_name: ' launch  ale ',
        producer_id: 20,
        product_category_id: 10,
        edition: '2026'
      }]
    }
    return []
  }
  dataProvider.create = async () => { creates += 1; return { id: 999 } }

  const { response } = responseRecorder()
  await assert.rejects(
    () => __testables.createProduct({ body: baseBody }, response, { id: 'session-owner' }),
    (error) => error.status === 409 && error.code === 'PRODUCT_ALREADY_EXISTS' && error.payload.existingProductId === 77
  )
  assert.equal(creates, 0)
})
