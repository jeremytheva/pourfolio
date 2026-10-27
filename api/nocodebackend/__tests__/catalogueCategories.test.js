import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const originalListPage = dataProvider.listPage

test.afterEach(() => {
  dataProvider.listPage = originalListPage
})

const recorder = () => {
  const result = { statusCode: null, body: null }
  const response = {
    status(code) { result.statusCode = code; return this },
    json(body) { result.body = body; return this }
  }
  return { result, response }
}

test('canonical categories are paginated independently of existing products and projected without provider privacy metadata', async () => {
  let requests = []
  dataProvider.listPage = async (collection, options) => {
    requests.push({ collection, ...options })
    assert.equal(collection, COLLECTIONS.categories)
    assert.equal(options.orderBy, 'category_name')
    assert.equal(options.order, 'asc')
    return {
      items: [{ id: 314, category_name: 'Witbier', parent_id: null, user_id: 'internal-owner', secret_key: 'private' }],
      page: 1, pageSize: 100, total: 1, totalPages: 1
    }
  }
  const { response, result } = recorder()
  await __testables.listCategories({ query: { page: '1', limit: '100' } }, response)
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, {
    items: [{ id: 314, category_name: 'Witbier', parent_id: null }],
    page: 1, pageSize: 100, total: 1, totalPages: 1
  })
  assert.equal(requests.length, 1)
})

test('category lookup does not suppress or invent provider failures', async () => {
  dataProvider.listPage = async () => { throw new Error('category provider unavailable') }
  const { response } = recorder()
  await assert.rejects(__testables.listCategories({ query: { page: '1' } }, response), /category provider unavailable/)
})
