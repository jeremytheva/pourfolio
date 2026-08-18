import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../data-proxy.js'
import { COLLECTIONS } from '../../../src/data/contract.js'

const original = { list: dataProvider.list, listPage: dataProvider.listPage, get: dataProvider.get }
test.afterEach(() => Object.assign(dataProvider, original))

const responseRecorder = () => {
  const result = { statusCode: null, body: null }
  return {
    result,
    response: { status(code) { result.statusCode = code; return this }, json(body) { result.body = body } }
  }
}

test('catalogue delegates deterministic page boundaries and the provider page limit', async () => {
  let options
  dataProvider.listPage = async (_collection, received) => {
    options = received
    return { items: [{ id: 101, product_name: 'Zulu' }], page: 3, pageSize: 100, total: 201, totalPages: 3 }
  }
  dataProvider.get = async () => null
  const { response, result } = responseRecorder()
  await __testables.listProducts({ query: { q: '  stout  ', page: '3', limit: '500' } }, response)
  assert.deepEqual(options, { search: 'stout', page: 3, limit: 100, orderBy: 'product_name', order: 'asc' })
  assert.deepEqual({ page: result.body.page, pageSize: result.body.pageSize, total: result.body.total,
    totalPages: result.body.totalPages }, { page: 3, pageSize: 100, total: 201, totalPages: 3 })
})

test('catalogue returns provider no-result metadata without collection hydration', async () => {
  dataProvider.listPage = async () => ({ items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 })
  dataProvider.get = async () => assert.fail('empty results must not hydrate relationships')
  const { response, result } = responseRecorder()
  await __testables.listProducts({ query: { q: 'absent' } }, response)
  assert.deepEqual(result.body, { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 })
})

test('rating history keeps its owner filter and deduplicates product relationships', async () => {
  const calls = []
  dataProvider.list = async (collection, filters) => {
    calls.push({ collection, filters })
    return collection === COLLECTIONS.ratings ? [
      { id: 1, user_id: 'owner', product_id: 7, submission_state: 'complete' },
      { id: 2, user_id: 'owner', product_id: 7, submission_state: 'complete' },
      { id: 3, user_id: 'intruder', product_id: 99, submission_state: 'complete' }
    ] : []
  }
  dataProvider.get = async (collection, id) => {
    calls.push({ collection, id })
    return collection === COLLECTIONS.products ? { id, producer_id: 4, product_category_id: 5 } : null
  }
  const { response, result } = responseRecorder()
  await __testables.listUserRatings(response, { id: 'owner' })
  assert.deepEqual(calls[0], { collection: COLLECTIONS.ratings, filters: { user_id: 'owner' } })
  assert.equal(calls.filter((call) => call.collection === COLLECTIONS.products).length, 1)
  assert.equal(calls.filter((call) => call.collection === COLLECTIONS.producers).length, 1)
  assert.equal(calls.filter((call) => call.collection === COLLECTIONS.categories).length, 1)
  assert.equal(calls.some((call) => String(call.id) === '99'), false)
  assert.equal(result.body.items.length, 2)
})

test('cellar owner isolation survives duplicate and missing relationships', async () => {
  const gets = []
  dataProvider.list = async (collection, filters) => {
    assert.equal(collection, COLLECTIONS.cellar)
    assert.deepEqual(filters, { user_id: 'owner' })
    return [
      { id: 1, user_id: 'owner', product_id: 8 },
      { id: 2, user_id: 'owner', product_id: 8 },
      { id: 3, user_id: 'other', product_id: 90 }
    ]
  }
  dataProvider.get = async (collection, id) => {
    gets.push([collection, String(id)])
    if (collection === COLLECTIONS.products) return { id, producer_id: 12, product_category_id: 13 }
    return null
  }
  const { response, result } = responseRecorder()
  await __testables.listCellar(response, { id: 'owner' })
  assert.deepEqual(gets, [[COLLECTIONS.products, '8'], [COLLECTIONS.producers, '12'], [COLLECTIONS.categories, '13']])
  assert.equal(result.body.items.length, 2)
  assert.equal(result.body.items.every((item) => item.product.producer === null && item.product.category === null), true)
})