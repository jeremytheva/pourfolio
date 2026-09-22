import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../rating-data-proxy.js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const user = { id: 'owner-a' }
const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

test('owner product history is paginated, owner-scoped, complete-only and newest first', async () => {
  const rows = Array.from({ length: 101 }, (_, index) => ({
    id: index + 1,
    user_id: user.id,
    product_id: 4,
    submission_state: 'complete',
    total_weighted: 3 + ((index % 10) / 10),
    date_rated: new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString()
  }))
  rows.push(
    { id: 500, user_id: user.id, product_id: 4, submission_state: 'failed', total_weighted: 4.9, date_rated: '2026-01-01T00:00:00.000Z' },
    { id: 501, user_id: 'owner-b', product_id: 4, submission_state: 'complete', total_weighted: 4.8, date_rated: '2026-01-02T00:00:00.000Z' },
    { id: 502, user_id: user.id, product_id: 5, submission_state: 'complete', total_weighted: 4.7, date_rated: '2026-01-03T00:00:00.000Z' }
  )

  const calls = []
  dataProvider.listPage = async (collection, options) => {
    assert.equal(collection, COLLECTIONS.ratings)
    calls.push(options)
    const start = (options.page - 1) * options.limit
    const items = rows.slice(start, start + options.limit)
    return {
      items,
      page: options.page,
      pageSize: options.limit,
      total: rows.length,
      totalPages: Math.ceil(rows.length / options.limit)
    }
  }

  const result = await __testables.ownerCompletedRatings(user.id, '4')

  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0].filters, { user_id: user.id, submission_state: 'complete', product_id: '4' })
  assert.equal(result.length, 101)
  assert.ok(result.every((rating) => rating.user_id === user.id))
  assert.ok(result.every((rating) => rating.submission_state === 'complete'))
  assert.ok(result.every((rating) => String(rating.product_id) === '4'))
  assert.equal(result[0].id, 101)
  assert.equal(result.at(-1).id, 1)
})

test('product-filtered /ratings/mine forwards the exact product filter to paginated owner history', async () => {
  const pageCalls = []
  dataProvider.listPage = async (collection, options) => {
    pageCalls.push({ collection, options })
    return { items: [], page: 1, pageSize: options.limit, total: 0, totalPages: 0 }
  }
  dataProvider.list = async () => []

  const result = response()
  await __testables.listUserRatings(result, user, { query: { product_id: '4' } })

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, { items: [] })
  assert.equal(pageCalls.length, 1)
  assert.equal(pageCalls[0].collection, COLLECTIONS.ratings)
  assert.equal(pageCalls[0].options.filters.product_id, '4')
})

test('product-filtered owner history rejects invalid product identifiers before provider access', async () => {
  let providerCalled = false
  dataProvider.listPage = async () => {
    providerCalled = true
    return { items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 }
  }

  await assert.rejects(
    __testables.listUserRatings(response(), user, { query: { product_id: '../4' } }),
    (error) => error?.status === 400 && /Product identifier is invalid/.test(error.message)
  )
  assert.equal(providerCalled, false)
})


test('Historical Feed query validation is strict and date ranges are ordered', () => {
  assert.deepEqual(
    __testables.parseHistoryQuery({ query: { page: '2', limit: '25', q: '  Rocky Ridge  ', from: '2025-01-01', to: '2026-09-22' } }),
    { page: 2, limit: 25, q: 'Rocky Ridge', from: '2025-01-01', to: '2026-09-22' }
  )

  assert.throws(
    () => __testables.parseHistoryQuery({ query: { page: '2x' } }),
    (error) => error?.status === 400 && /History page is invalid/.test(error.message)
  )
  assert.throws(
    () => __testables.parseHistoryQuery({ query: { limit: '51' } }),
    (error) => error?.status === 400 && /History page size is invalid/.test(error.message)
  )
  assert.throws(
    () => __testables.parseHistoryQuery({ query: { from: '2026-09-23', to: '2026-09-22' } }),
    (error) => error?.status === 400 && /start date must not be after/.test(error.message)
  )
  assert.throws(
    () => __testables.parseHistoryQuery({ query: { from: '2026-02-30' } }),
    (error) => error?.status === 400 && /start date is invalid/.test(error.message)
  )
})

test('Historical Feed filters only owner projection fields and preserves repeat events', () => {
  const items = [
    {
      id: 3,
      date_rated: '2026-09-21T00:00:00.000Z',
      product: { product_name: 'Ace', producer: { producer_name: 'Rocky Ridge Brewing' } }
    },
    {
      id: 2,
      date_rated: '2026-06-10T00:00:00.000Z',
      product: { product_name: 'Ace', producer: { producer_name: 'Rocky Ridge Brewing' } }
    },
    {
      id: 1,
      date_rated: '2024-01-01T00:00:00.000Z',
      product: { product_name: 'Other', producer: { producer_name: 'Elsewhere Brewing' } }
    }
  ]

  const filtered = __testables.filterOwnerHistory(items, {
    q: 'ridge',
    from: '2025-01-01',
    to: '2026-12-31'
  })

  assert.deepEqual(filtered.map((item) => item.id), [3, 2])
})

test('Historical Feed paginates after owner-safe search filtering', async () => {
  const ownerRows = [
    { id: 1, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 4.1, date_rated: '2025-06-18T00:00:00.000Z' },
    { id: 2, user_id: user.id, product_id: 5, submission_state: 'complete', total_weighted: 3.7, date_rated: '2026-01-05T00:00:00.000Z' },
    { id: 3, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 4.5, date_rated: '2026-09-21T00:00:00.000Z' }
  ]
  const products = [
    { id: 4, product_name: 'Ace', producer_id: 20, product_category_id: 10 },
    { id: 5, product_name: 'Other Beer', producer_id: 21, product_category_id: 11 }
  ]
  const producers = [
    { id: 20, producer_name: 'Rocky Ridge Brewing' },
    { id: 21, producer_name: 'Elsewhere Brewing' }
  ]
  const categories = [
    { id: 10, category_name: 'Pale Ale' },
    { id: 11, category_name: 'Lager' }
  ]

  dataProvider.listPage = async (collection, options) => {
    assert.equal(collection, COLLECTIONS.ratings)
    const filtered = ownerRows.filter((item) =>
      Object.entries(options.filters || {}).every(([key, value]) => String(item[key]) === String(value)))
    return { items: filtered, page: 1, pageSize: options.limit, total: filtered.length, totalPages: filtered.length ? 1 : 0 }
  }
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.ratings) return ownerRows
    if (collection === COLLECTIONS.cellar) return []
    if (collection === COLLECTIONS.products) return products
    if (collection === COLLECTIONS.categories) return categories
    return []
  }
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.products) return products.find((item) => String(item.id) === String(id)) || null
    if (collection === COLLECTIONS.producers) return producers.find((item) => String(item.id) === String(id)) || null
    if (collection === COLLECTIONS.categories) return categories.find((item) => String(item.id) === String(id)) || null
    return null
  }

  const result = response()
  await __testables.listUserHistory(result, user, {
    query: { page: '2', limit: '1', q: 'Rocky Ridge', from: '2025-01-01', to: '2026-12-31' }
  })

  assert.equal(result.statusCode, 200)
  assert.equal(result.body.total, 2)
  assert.equal(result.body.totalPages, 2)
  assert.equal(result.body.page, 2)
  assert.equal(result.body.items.length, 1)
  assert.equal(result.body.items[0].id, 1)
  assert.equal(result.body.items[0].event_type, 'full_tasting')
  assert.equal(result.body.items[0].product.producer.producer_name, 'Rocky Ridge Brewing')
})


test('unfiltered Historical Feed enriches only the requested response page', async () => {
  const ownerRows = [
    { id: 1, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 4.1, date_rated: '2025-01-01T00:00:00.000Z' },
    { id: 2, user_id: user.id, product_id: 5, submission_state: 'complete', total_weighted: 4.2, date_rated: '2026-01-01T00:00:00.000Z' },
    { id: 3, user_id: user.id, product_id: 6, submission_state: 'complete', total_weighted: 4.3, date_rated: '2026-09-01T00:00:00.000Z' }
  ]
  const products = [
    { id: 4, product_name: 'Old Beer', producer_id: 20, product_category_id: 10 },
    { id: 5, product_name: 'Middle Beer', producer_id: 21, product_category_id: 11 },
    { id: 6, product_name: 'New Beer', producer_id: 22, product_category_id: 12 }
  ]
  const producers = [
    { id: 20, producer_name: 'Old Brewery' },
    { id: 21, producer_name: 'Middle Brewery' },
    { id: 22, producer_name: 'New Brewery' }
  ]
  const categories = [
    { id: 10, category_name: 'Old Style' },
    { id: 11, category_name: 'Middle Style' },
    { id: 12, category_name: 'New Style' }
  ]
  let productGetCount = 0

  dataProvider.listPage = async (collection, options) => ({
    items: ownerRows.filter((item) =>
      Object.entries(options.filters || {}).every(([key, value]) => String(item[key]) === String(value))),
    page: 1,
    pageSize: options.limit,
    total: ownerRows.length,
    totalPages: 1
  })
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.ratings) return ownerRows
    if (collection === COLLECTIONS.cellar) return []
    if (collection === COLLECTIONS.products) return products
    if (collection === COLLECTIONS.categories) return categories
    return []
  }
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.products) {
      productGetCount += 1
      return products.find((item) => String(item.id) === String(id)) || null
    }
    if (collection === COLLECTIONS.producers) return producers.find((item) => String(item.id) === String(id)) || null
    if (collection === COLLECTIONS.categories) return categories.find((item) => String(item.id) === String(id)) || null
    return null
  }

  const result = response()
  await __testables.listUserHistory(result, user, { query: { page: '2', limit: '1' } })

  assert.equal(result.statusCode, 200)
  assert.equal(result.body.total, 3)
  assert.equal(result.body.totalPages, 3)
  assert.equal(result.body.items.length, 1)
  assert.equal(result.body.items[0].id, 2)
  assert.equal(productGetCount, 1)
})
