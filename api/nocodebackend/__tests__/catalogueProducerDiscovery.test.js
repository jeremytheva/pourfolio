import assert from 'node:assert/strict'
import test from 'node:test'

import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const originalListPage = dataProvider.listPage

test.afterEach(() => {
  dataProvider.listPage = originalListPage
})

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

const producers = [
  { id: 20, producer_name: 'Rocky Ridge Brewing', address: 'Katoomba NSW', suburb_id: 9567 },
  { id: 30, producer_name: 'Collab Brewing', address: 'Sydney NSW', suburb_id: null },
  { id: 40, producer_name: 'Empty Brewing', address: 'Nowhere', suburb_id: null }
]

const canonicalRelationships = [
  { id: 1, product_id: 1, producer_id: 20, is_primary: 1, sort_order: 1 },
  { id: 2, product_id: 1, producer_id: 30, is_primary: 0, sort_order: 2 },
  { id: 3, product_id: 3, producer_id: 30, is_primary: 1, sort_order: 1 }
]

const legacyProducts = [
  { id: 1, producer_id: 20, product_name: 'Canonical collaboration' },
  { id: 2, producer_id: 20, product_name: 'Legacy-only beer' },
  { id: 3, producer_id: 40, product_name: 'Legacy pointer superseded by junction' }
]

const page = (items, limit = 100) => ({
  items,
  page: 1,
  pageSize: limit,
  total: items.length,
  totalPages: items.length ? 1 : 0
})

const installProvider = () => {
  dataProvider.listPage = async (collection, { filters = {}, limit = 100 }) => {
    if (collection === COLLECTIONS.producers) return page(producers, limit)

    if (collection === COLLECTIONS.productProducers && filters['producer_id[in]']) {
      const ids = new Set(String(filters['producer_id[in]']).split(','))
      return page(canonicalRelationships.filter((row) => ids.has(String(row.producer_id))), limit)
    }

    if (collection === COLLECTIONS.products && filters['producer_id[in]']) {
      const ids = new Set(String(filters['producer_id[in]']).split(','))
      return page(legacyProducts.filter((row) => ids.has(String(row.producer_id))), limit)
    }

    if (collection === COLLECTIONS.productProducers && filters['product_id[in]']) {
      const ids = new Set(String(filters['product_id[in]']).split(','))
      return page(canonicalRelationships.filter((row) => ids.has(String(row.product_id))), limit)
    }

    return page([], limit)
  }
}

test('verified producer discovery counts junction relationships and legacy-only fallback without double counting', async () => {
  installProvider()
  const { response, result } = responseRecorder()

  await __testables.listProducers({
    query: { hasProducts: 'true', page: '1', limit: '24' }
  }, response)

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, {
    items: [
      { producer: producers[1], productCount: 2 },
      { producer: producers[0], productCount: 2 }
    ],
    page: 1,
    pageSize: 24,
    total: 2,
    totalPages: 1
  })
})

test('verified producer discovery searches canonical name and verified address on the server', async () => {
  installProvider()

  const byAddress = responseRecorder()
  await __testables.listProducers({
    query: { hasProducts: 'true', q: 'katoomba', page: '1', limit: '24' }
  }, byAddress.response)
  assert.deepEqual(byAddress.result.body.items, [{ producer: producers[0], productCount: 2 }])

  const byName = responseRecorder()
  await __testables.listProducers({
    query: { hasProducts: 'true', q: 'collab', page: '1', limit: '24' }
  }, byName.response)
  assert.deepEqual(byName.result.body.items, [{ producer: producers[1], productCount: 2 }])
})

test('verified producer discovery excludes producers whose legacy pointer is superseded by another canonical relationship', async () => {
  installProvider()
  const { response, result } = responseRecorder()

  await __testables.listProducers({
    query: { hasProducts: 'true', q: 'empty', page: '1', limit: '24' }
  }, response)

  assert.deepEqual(result.body, {
    items: [],
    page: 1,
    pageSize: 24,
    total: 0,
    totalPages: 0
  })
})
