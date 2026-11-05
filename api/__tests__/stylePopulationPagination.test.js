import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../_lib/dataProvider.js'
import { __testables as ratingsGateway } from '../rating-data-proxy.js'

const complete = (id, productId = id) => ({ id, product_id: productId,
  total_weighted: 4, submission_state: 'complete', user_id: 'synthetic-owner' })
const wireResponse = (payload, status = 200) => ({
  status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(payload)
})
const fixture = (context, records, { ignoreFilters = [], rawCollections = [], respond } = {}) => {
  const env = { NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'synthetic-style-secret', NOCODEBACKEND_INSTANCE: 'synthetic-style-instance' }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  Object.assign(process.env, env)
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
  for (const method of ['create', 'update', 'remove', 'compareAndSet']) {
    context.mock.method(dataProvider, method, () => assert.fail('score populations must not mutate provider data'))
  }
  const calls = []
  context.mock.method(globalThis, 'fetch', async url => {
    const request = new URL(url)
    const collection = request.pathname.split('/')[2]
    const requested = request.searchParams.get('id[in]')?.split(',')
    let rows = records[collection] || []
    if (requested && !ignoreFilters.includes(collection)) rows = rows.filter(row => requested.includes(String(row.id)))
    const page = Number(request.searchParams.get('page') || 1)
    const limit = Number(request.searchParams.get('limit') || 25)
    calls.push({ collection, page, limit, requested })
    const items = rows.slice((page - 1) * limit, page * limit)
    if (respond) {
      const response = respond({ collection, page, limit, rows, items })
      if (response) return response
    }
    if (rawCollections.includes(collection)) return wireResponse({ data: items })
    return wireResponse({ data: items, pagination: {
      page, per_page: limit, total: rows.length, total_pages: Math.ceil(rows.length / limit)
    } })
  })
  return calls
}

test('style populations include all 30 distinct rated products past the unpaged default', async context => {
  fixture(context, {
    ratings: Array.from({ length: 30 }, (_, index) => complete(index + 1)),
    products: Array.from({ length: 30 }, (_, index) => ({ id: index + 1, product_category_id: 10 })),
    categories: [{ id: 10 }]
  })
  const result = await ratingsGateway.scorePopulations()
  assert.equal(result.overall.length, 30)
  assert.equal(result.styleIndex.styleScores.get('10')?.length, 30)
  const late = ratingsGateway.advancedFor(complete(30), result)
  assert.equal(late.style_id, '10')
  assert.equal(late.style_sample_size, 30)
  assert.equal(late.style_scaled_score, 50)
  assert.equal(late.style_rank_text_eligible, true)
})

test('ratings, product ID batches and category ID batches remain complete beyond 200 distinct relationships', async context => {
  const valid = Array.from({ length: 205 }, (_, index) => complete(index + 1))
  const excluded = ['pending', 'failed', 'deleting', 'deleted'].map((state, index) => ({
    ...complete(206 + index, 999), submission_state: state
  }))
  excluded.push({ ...complete(210, 999), deleted_at: '2026-10-28 00:00:00' })
  const calls = fixture(context, {
    ratings: [...valid, ...excluded],
    products: valid.map(row => ({ id: row.product_id, product_category_id: 1000 + row.product_id })),
    categories: valid.map(row => ({ id: 1000 + row.product_id }))
  })
  const result = await ratingsGateway.scorePopulations()
  assert.equal(result.overall.length, 205)
  assert.equal(result.styleIndex.productStyleIds.size, 205)
  assert.equal(result.styleIndex.styleScores.size, 205)
  const late = ratingsGateway.advancedFor(complete(205), result)
  assert.equal(late.style_id, '1205')
  assert.equal(late.style_sample_size, 1)
  assert.equal(late.style_scaled_score, 50)
  assert.deepEqual(calls.filter(call => call.collection === 'ratings').map(call => call.page), [1, 2, 3])
  for (const collection of ['products', 'categories']) {
    const queries = calls.filter(call => call.collection === collection)
    assert.deepEqual(queries.map(call => call.requested.length), [100, 100, 5])
    assert.equal(new Set(queries.flatMap(call => call.requested)).size, 205)
    assert.ok(queries.every(call => call.limit === 100 && !call.requested.includes('999')))
  }
})

test('late-page relationships survive broad provider responses while unrelated rows stay excluded', async context => {
  const calls = fixture(context, {
    ratings: Array.from({ length: 30 }, (_, index) => complete(index + 1, index + 121)),
    products: Array.from({ length: 150 }, (_, index) => ({ id: index + 1, product_category_id: 150 })),
    categories: Array.from({ length: 150 }, (_, index) => ({ id: index + 1 }))
  }, { ignoreFilters: ['products', 'categories'] })
  const result = await ratingsGateway.scorePopulations()
  assert.equal(result.overall.length, 30)
  assert.equal(result.styleIndex.styleScores.get('150').length, 30)
  assert.equal(result.styleIndex.productStyleIds.size, 30)
  assert.equal(result.styleIndex.productStyleIds.has('1'), false)
  for (const collection of ['products', 'categories']) {
    assert.deepEqual(calls.filter(call => call.collection === collection).map(call => call.page), [1, 2])
  }
  assert.equal(ratingsGateway.advancedFor(complete(30, 150), result).style_sample_size, 30)
})

test('array-only product/category pages continue through empty terminal pages in each ID batch', async context => {
  const valid = Array.from({ length: 200 }, (_, index) => complete(index + 1))
  const calls = fixture(context, { ratings: valid,
    products: valid.map(row => ({ id: row.product_id, product_category_id: 1000 + row.product_id })),
    categories: valid.map(row => ({ id: 1000 + row.product_id }))
  }, { rawCollections: ['products', 'categories'] })
  const result = await ratingsGateway.scorePopulations()
  assert.equal(result.styleIndex.productStyleIds.size, 200)
  for (const collection of ['products', 'categories']) {
    assert.deepEqual(calls.filter(call => call.collection === collection).map(call => call.page), [1, 2, 1, 2])
  }
})

test('later product or category page failure cannot return a partial population', async context => {
  for (const failingCollection of ['products', 'categories']) {
    await context.test(failingCollection, async child => {
      fixture(child, { ratings: [complete(1, 150)],
        products: Array.from({ length: 150 }, (_, index) => ({ id: index + 1, product_category_id: 150 })),
        categories: Array.from({ length: 150 }, (_, index) => ({ id: index + 1 }))
      }, { ignoreFilters: ['products', 'categories'], respond: ({ collection, page }) =>
        collection === failingCollection && page === 2 ? wireResponse({ error: 'synthetic-unavailable' }, 503) : null })
      await assert.rejects(ratingsGateway.scorePopulations(), error => error.status === 503)
    })
  }
})

test('duplicate or conflicting product identities reject the entire population', async context => {
  fixture(context, { ratings: [complete(1)], products: [
    { id: 1, product_category_id: 10 }, { id: '1', product_category_id: 11 }
  ], categories: [{ id: 10 }, { id: 11 }] })
  await assert.rejects(ratingsGateway.scorePopulations(), { status: 502, code: 'RATING_RELATIONSHIPS_UNVERIFIED' })
})

test('invalid relationship IDs and changing exact pagination cannot qualify a partial population', async context => {
  await context.test('malformed identity', async child => {
    fixture(child, { ratings: [complete(1)], products: [{ id: [1], product_category_id: 10 }] })
    await assert.rejects(ratingsGateway.scorePopulations(), { code: 'RATING_RELATIONSHIPS_UNVERIFIED' })
  })
  await context.test('population changed across pages', async child => {
    fixture(child, { ratings: [complete(1, 150)],
      products: Array.from({ length: 150 }, (_, index) => ({ id: index + 1, product_category_id: 10 }))
    }, { ignoreFilters: ['products'], respond: ({ collection, page, limit, items }) =>
      collection === 'products' && page === 2 ? wireResponse({ data: items.slice(0, 49),
        pagination: { page, per_page: limit, total: 149, total_pages: 2 } }) : null })
    await assert.rejects(ratingsGateway.scorePopulations(), { code: 'RATING_RELATIONSHIPS_UNVERIFIED' })
  })
})

test('missing canonical relationships remain unavailable without fabricating style evidence', async context => {
  fixture(context, { ratings: [complete(1), complete(2)],
    products: [{ id: 1, product_category_id: 10 }], categories: [] })
  const result = await ratingsGateway.scorePopulations()
  assert.equal(result.overall.length, 2)
  for (const rating of [complete(1), complete(2)]) {
    const advanced = ratingsGateway.advancedFor(rating, result)
    assert.equal(advanced.style_id, null)
    assert.equal(advanced.style_sample_size, 0)
    assert.equal(advanced.style_scaled_score, null)
  }
})

test('empty completed population does not issue relationship reads', async context => {
  const calls = fixture(context, { ratings: [] })
  const result = await ratingsGateway.scorePopulations()
  assert.deepEqual(result.overall, [])
  assert.equal(result.styleIndex.productStyleIds.size, 0)
  assert.deepEqual(calls.map(call => call.collection), ['ratings'])
})

test('an oversized advertised relationship scan fails before further provider reads', async context => {
  const calls = fixture(context, { ratings: [complete(1)], products: [{ id: 1 }] }, {
    respond: ({ collection, page, limit }) => collection === 'products' ? wireResponse({
      data: Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
      pagination: { page, per_page: limit, total: 100001, total_pages: 1001 }
    }) : null
  })
  await assert.rejects(ratingsGateway.scorePopulations(), { code: 'RATING_RELATIONSHIPS_UNVERIFIED' })
  assert.equal(calls.filter(call => call.collection === 'products').length, 1)
})
