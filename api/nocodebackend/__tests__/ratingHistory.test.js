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
  assert.deepEqual(calls[0].filters, { user_id: user.id })
  assert.equal(result.length, 101)
  assert.ok(result.every((rating) => rating.user_id === user.id))
  assert.ok(result.every((rating) => rating.submission_state === 'complete'))
  assert.ok(result.every((rating) => String(rating.product_id) === '4'))
  assert.equal(result[0].id, 101)
  assert.equal(result.at(-1).id, 1)
})

test('product-filtered /ratings/mine keeps the provider query owner-only', async () => {
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
  assert.deepEqual(pageCalls[0].options.filters, { user_id: user.id })
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

const installHistoryRows = (rows) => {
  dataProvider.listPage = async (collection, options) => {
    assert.equal(collection, COLLECTIONS.ratings)
    assert.deepEqual(options.filters, { user_id: user.id })
    const start = (options.page - 1) * options.limit
    return { items: rows.slice(start, start + options.limit), page: options.page, pageSize: options.limit, total: rows.length, totalPages: Math.ceil(rows.length / options.limit) }
  }
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.ratings) throw new Error('Comparison scores unavailable')
    return []
  }
  dataProvider.get = async (collection, id) => collection === COLLECTIONS.products ? { id, product_name: `Beer ${id}` } : null
}

test('a canonical rating link resolves its older page without enriching the entire history', async () => {
  const rows = Array.from({ length: 45 }, (_, index) => ({
    id: index + 1, rating_id: 1700000000000000 + index, user_id: user.id,
    product_id: index + 1, submission_state: 'complete', total_weighted: index < 25 ? 3 : 5,
    date_rated: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
  }))
  installHistoryRows(rows)
  const productReads = []
  dataProvider.get = async (collection, id) => {
    assert.equal(collection, COLLECTIONS.products)
    productReads.push(Number(id))
    return { id, product_name: `Beer ${id}` }
  }
  const result = response()
  await __testables.listUserHistory(result, user, { query: { rating_id: '25' } })
  assert.equal(result.body.page, 2)
  assert.equal(result.body.totalPages, 3)
  assert.equal(result.body.items.length, 20)
  assert.equal(result.body.items[0].id, 25)
  assert.deepEqual(productReads.sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => index + 6))
  assert.deepEqual(result.body.summary, { count: 45, averageWeighted: 3.89 })
  assert.equal(result.body.items[0].advanced_scores.score_out_of_100, 60)
  assert.equal(result.body.items[0].advanced_scores.scaled_score, null)
})

test('unavailable, deleted, incomplete, foreign and legacy submission identifiers have the same safe result', async () => {
  installHistoryRows([
    { id: 1, rating_id: 1001, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 4 },
    { id: 2, user_id: 'owner-b', product_id: 4, submission_state: 'complete', total_weighted: 5 },
    { id: 3, user_id: user.id, product_id: 4, submission_state: 'deleted', total_weighted: 3 },
    { id: 4, user_id: user.id, product_id: 4, submission_state: 'pending', total_weighted: 4 },
    { id: 5, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: null }
  ])
  for (const ratingId of ['2', '3', '4', '5', '6', '1001']) {
    await assert.rejects(__testables.listUserHistory(response(), user, { query: { rating_id: ratingId } }),
      (error) => error.status === 404 && error.code === 'rating_not_found' && error.message === 'That rating is not available in your history.')
  }
})

test('invalid rating links fail before any provider read', async () => {
  dataProvider.listPage = async () => { assert.fail('Invalid selectors must not reach the provider') }
  for (const ratingId of ['', '0', '-1', '../1', '1x', '9007199254740992']) {
    await assert.rejects(__testables.listUserHistory(response(), user, { query: { rating_id: ratingId } }),
      (error) => error.status === 400 && /History rating identifier is invalid/.test(error.message))
  }
})

test('a linked rating resolves within owner-safe search and date filters', async () => {
  installHistoryRows([
    { id: 1, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 4, date_rated: '2025-01-01' },
    { id: 2, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 5, date_rated: '2026-01-01' }
  ])
  const result = response()
  await __testables.listUserHistory(result, user, { query: { rating_id: '1', q: 'Beer 4', limit: '1' } })
  assert.equal(result.body.page, 2)
  assert.equal(result.body.items[0].id, 1)
  assert.equal(result.body.summary.averageWeighted, 4.5)
  await assert.rejects(__testables.listUserHistory(response(), user, { query: { rating_id: '1', from: '2026-01-01' } }), (error) => error.status === 404)
})

test('optional enrichment failures preserve the verified rating and available beer identity', async () => {
  installHistoryRows([{ id: 1, user_id: user.id, product_id: 4, submission_state: 'complete', total_weighted: 4 }])
  dataProvider.list = async () => { throw new Error('Optional data unavailable') }
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.products) return { id, product_name: 'Ace', producer_id: 20, product_category_id: 10 }
    throw new Error('Relationship unavailable')
  }
  const result = response()
  await __testables.listUserHistory(result, user)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.items[0].id, 1)
  assert.equal(result.body.items[0].product.product_name, 'Ace')
  assert.equal(result.body.items[0].product.producer, null)
  assert.equal(result.body.items[0].product.category, null)
  assert.equal(result.body.items[0].advanced_scores.score_out_of_100, 80)
  assert.equal(result.body.items[0].advanced_scores.style_scaled_score, null)
  assert.equal(result.body.items[0].advanced_scores.purchased_ppp, null)
  dataProvider.get = async () => { throw new Error('Beer unavailable') }
  const fallback = response()
  await __testables.listUserHistory(fallback, user)
  assert.equal(fallback.body.items[0].product, null)
  assert.equal(fallback.body.items[0].total_weighted, 4)
})

test('optional enrichment shares one deadline even when the provider never resolves', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 })
  const rows = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, product_id: index + 1, total_weighted: 4 }))
  let metadataReads = 0
  dataProvider.list = async () => new Promise(() => {})
  dataProvider.get = async () => { metadataReads += 1; return new Promise(() => {}) }
  const projected = __testables.projectOwnerRatingItems(user, rows)
  await new Promise(setImmediate)
  context.mock.timers.tick(5_000)
  const result = await projected
  assert.equal(result.length, 12)
  assert.equal(metadataReads, 4)
  assert.ok(result.every((item) => item.product === null && item.advanced_scores.score_out_of_100 === 80))
})

test('metadata concurrency is bounded and shared relationships are read once per request', async () => {
  installHistoryRows([])
  let active = 0
  let maximumActive = 0
  const reads = []
  dataProvider.get = async (collection, id) => {
    reads.push(`${collection}:${id}`)
    if (collection === COLLECTIONS.products) {
      active += 1
      maximumActive = Math.max(active, maximumActive)
      await new Promise(setImmediate)
      active -= 1
      return { id, product_name: `Beer ${id}`, producer_id: 20, product_category_id: 10 }
    }
    if (collection === COLLECTIONS.producers) return { id, producer_name: 'Brewery' }
    if (collection === COLLECTIONS.categories) return { id, category_name: 'Pale Ale' }
    return null
  }
  const rows = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, product_id: index + 1, total_weighted: 4 }))
  const result = await __testables.projectOwnerRatingItems(user, rows)
  assert.equal(maximumActive, 4)
  assert.equal(reads.filter((key) => key === `${COLLECTIONS.producers}:20`).length, 1)
  assert.equal(reads.filter((key) => key === `${COLLECTIONS.categories}:10`).length, 1)
  assert.ok(result.every((item) => item.product.producer.producer_name === 'Brewery'))
  await __testables.projectOwnerRatingItems({ id: 'owner-b' }, rows.slice(0, 1))
  assert.equal(reads.filter((key) => key === `${COLLECTIONS.producers}:20`).length, 2)
})

test('mandatory owner history failures still fail closed instead of presenting an empty history', async () => {
  dataProvider.listPage = async () => { throw new Error('Owner history unavailable') }
  await assert.rejects(__testables.listUserHistory(response(), user), /Owner history unavailable/)
})
