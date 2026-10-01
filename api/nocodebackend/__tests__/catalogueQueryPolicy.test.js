import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables as catalogue } from '../../catalog-data-proxy.js'
import { __testables as cellar } from '../../cellar-data-proxy.js'
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
  dataProvider.list = async () => []
  const { response, result } = responseRecorder()
  await catalogue.listProducts({ query: { q: '  stout  ', page: '3', limit: '500' } }, response)
  assert.deepEqual(options, { search: 'stout', page: 3, limit: 100, orderBy: 'product_name', order: 'asc' })
  assert.deepEqual({
    page: result.body.page,
    pageSize: result.body.pageSize,
    total: result.body.total,
    totalPages: result.body.totalPages
  }, { page: 3, pageSize: 100, total: 201, totalPages: 3 })
})

test('catalogue returns provider no-result metadata without relationship hydration', async () => {
  dataProvider.listPage = async () => ({ items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 })
  dataProvider.list = async () => assert.fail('empty results must not hydrate relationships')
  const { response, result } = responseRecorder()
  await catalogue.listProducts({ query: { q: 'absent' } }, response)
  assert.deepEqual(result.body, { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 })
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
  await cellar.listCellar(response, { id: 'owner' })
  assert.deepEqual(gets, [
    [COLLECTIONS.products, '8'],
    [COLLECTIONS.producers, '12'],
    [COLLECTIONS.categories, '13']
  ])
  assert.equal(result.body.items.length, 2)
  assert.equal(result.body.items.every((item) => item.product.producer === null && item.product.category === null), true)
})
