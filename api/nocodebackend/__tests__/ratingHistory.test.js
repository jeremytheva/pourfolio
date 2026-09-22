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
