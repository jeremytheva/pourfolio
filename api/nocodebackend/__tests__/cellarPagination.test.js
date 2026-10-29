import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables as cellar, routeCellarRequest } from '../../cellar-data-proxy.js'
import { COLLECTIONS } from '../../../src/data/contract.js'

const user = { id: 'cellar-owner' }
const item = (id, extra = {}) => ({ id, user_id: user.id, product_id: null, quantity: 0, ...extra })
const response = () => ({
  statusCode: null, body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this }
})
const wireResponse = (payload, status = 200) => ({
  status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(payload)
})

// Exercise the real provider adapter: an unpaged request sees only 25 rows.
const providerFixture = (context, rows, { rawPages = false, pageResponse, recordResponse } = {}) => {
  const env = {
    NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'synthetic-cellar-secret',
    NOCODEBACKEND_INSTANCE: 'synthetic-cellar-instance'
  }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  Object.assign(process.env, env)
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
  for (const method of ['create', 'update', 'remove']) {
    context.mock.method(dataProvider, method, () => assert.fail('listing must not mutate provider records'))
  }
  const calls = []
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    const request = { url: new URL(url), options }
    calls.push(request)
    if (request.url.pathname !== '/read/cellar') {
      return recordResponse ? recordResponse(request) : wireResponse({ data: null })
    }
    const page = Number(request.url.searchParams.get('page') || 1)
    const limit = Number(request.url.searchParams.get('limit') || 25)
    const items = rows.slice((page - 1) * limit, page * limit)
    if (pageResponse) return pageResponse({ page, limit, items, request })
    return wireResponse(rawPages ? { data: items } : {
      data: items, pagination: { page, per_page: limit, total: rows.length, total_pages: Math.ceil(rows.length / limit) }
    })
  })
  return calls
}

test('cellar listing returns every owner row past the provider default page', async context => {
  const rows = Array.from({ length: 205 }, (_, index) => item(index + 1))
  const calls = providerFixture(context, rows)
  const reply = response()
  await routeCellarRequest({ method: 'GET', query: { path: 'cellar' } }, reply, user)
  assert.equal(reply.statusCode, 200)
  assert.equal(reply.body.items.length, 205)
  assert.equal(reply.body.items.at(-1).id, 205)
  assert.equal(new Set(reply.body.items.map(row => row.id)).size, 205)
  assert.deepEqual(calls.map(({ url }) => url.searchParams.get('page')), ['1', '2', '3'])
  for (const { url, options } of calls) {
    assert.equal(url.searchParams.get('user_id'), user.id)
    assert.equal(url.searchParams.get('limit'), '100')
    assert.equal(url.searchParams.get('sort'), 'id')
    assert.equal(url.searchParams.get('order'), 'asc')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.headers['cache-control'], 'no-cache')
  }
})

test('cellar listing follows array-only pages through a final empty page', async context => {
  const calls = providerFixture(context, Array.from({ length: 200 }, (_, index) => item(index + 1)), { rawPages: true })
  const reply = response()
  await cellar.listCellar(reply, user)
  assert.equal(reply.body.items.length, 200)
  assert.equal(calls.length, 3)
})

test('empty cellar does not hydrate products', async context => {
  const calls = providerFixture(context, [], { recordResponse: () => assert.fail('empty cellar must not hydrate') })
  const reply = response()
  await cellar.listCellar(reply, user)
  assert.deepEqual(reply.body, { items: [] })
  assert.equal(calls.length, 1)
})

test('foreign and ownerless rows are excluded before hydration while nullable and zero values survive', async context => {
  const calls = providerFixture(context, [
    item(1, { gift: '0', purchase_price: 0, retail_price: 0, secret_key: 'synthetic-private-value' }),
    item(2, { user_id: 'other-owner', product_id: 900 }),
    item(3, { user_id: null, product_id: 901 }),
    item(4, { user_id: [user.id], product_id: 902 }),
    item('9007199254740993')
  ], { recordResponse: () => assert.fail('unowned products must not be read') })
  const reply = response()
  await cellar.listCellar(reply, user)
  assert.deepEqual(reply.body.items.map(row => row.id), [1, '9007199254740993'])
  assert.equal(reply.body.items[0].quantity, 0)
  assert.equal(reply.body.items[0].purchase_price, 0)
  assert.equal(reply.body.items[0].retail_price, 0)
  assert.equal(reply.body.items[0].gift, false)
  assert.equal(reply.body.items[0].sharing_series_id, null)
  assert.equal(reply.body.items[0].series_version_id, null)
  assert.equal(reply.body.items[0].product, null)
  assert.equal(JSON.stringify(reply.body).includes('synthetic-private-value'), false)
  assert.equal(Object.hasOwn(reply.body.items[0], 'user_id'), false)
  assert.equal(calls.length, 1)
})

test('later-page failure cannot return a successful partial cellar', async context => {
  providerFixture(context, Array.from({ length: 205 }, (_, index) => item(index + 1)), {
    pageResponse: ({ page, limit, items }) => page === 2
      ? wireResponse({ error: 'synthetic provider unavailable' }, 503)
      : wireResponse({ data: items, pagination: { page, per_page: limit, total: 205, total_pages: 3 } })
  })
  const reply = response()
  await assert.rejects(cellar.listCellar(reply, user), error => error.status === 503)
  assert.equal(reply.statusCode, null)
  assert.equal(reply.body, null)
})

test('duplicate IDs across pages cannot publish a partial cellar', async context => {
  providerFixture(context, [
    ...Array.from({ length: 100 }, (_, index) => item(index + 1)),
    ...Array.from({ length: 5 }, (_, index) => item(index + 100))
  ])
  const reply = response()
  await assert.rejects(cellar.listCellar(reply, user), { status: 502, code: 'CELLAR_READ_UNVERIFIED' })
  assert.equal(reply.body, null)
})

test('invalid and noncanonical provider identities fail before success', async context => {
  for (const id of [null, 0, -1, '01', 'bad', [], [2], {}, true, Number.MAX_SAFE_INTEGER + 1]) {
    await context.test(String(id), async child => {
      providerFixture(child, [item(1), item(id)])
      const reply = response()
      await assert.rejects(cellar.listCellar(reply, user), { status: 502, code: 'CELLAR_READ_UNVERIFIED' })
      assert.equal(reply.body, null)
    })
  }
})

test('nonmonotonic IDs and drifting exact totals cannot claim a complete cellar', async context => {
  await context.test('provider ignored deterministic ordering', async child => {
    providerFixture(child, [item(2), item(1)])
    const reply = response()
    await assert.rejects(cellar.listCellar(reply, user), { code: 'CELLAR_READ_UNVERIFIED' })
    assert.equal(reply.body, null)
  })
  await context.test('advertised population changed between pages', async child => {
    providerFixture(child, Array.from({ length: 205 }, (_, index) => item(index + 1)), {
      pageResponse: ({ page, limit, items }) => wireResponse({
        data: items, pagination: { page, per_page: limit, total: page === 1 ? 205 : 204, total_pages: 3 }
      })
    })
    const reply = response()
    await assert.rejects(cellar.listCellar(reply, user), { code: 'CELLAR_READ_UNVERIFIED' })
    assert.equal(reply.body, null)
  })
})

test('an advertised population beyond the bounded page count fails without scanning it', async context => {
  const calls = providerFixture(context, Array.from({ length: 100 }, (_, index) => item(index + 1)), {
    pageResponse: ({ page, limit, items }) => wireResponse({
      data: items, pagination: { page, per_page: limit, total: 100001, total_pages: 1001 }
    })
  })
  const reply = response()
  await assert.rejects(cellar.listCellar(reply, user), { code: 'CELLAR_READ_UNVERIFIED' })
  assert.equal(calls.length, 1)
  assert.equal(reply.body, null)
})

test('product hydration bounds concurrent reads and deduplicates shared relationships', async context => {
  let active = 0
  let peak = 0
  const reads = new Map()
  providerFixture(context, Array.from({ length: 24 }, (_, index) => item(index + 1, { product_id: Math.floor(index / 2) + 1 })), {
    recordResponse: async ({ url, options }) => {
      const [, , collection, id] = url.pathname.split('/')
      reads.set(`${collection}:${id}`, (reads.get(`${collection}:${id}`) || 0) + 1)
      assert.equal(options.cache, 'no-store')
      active += 1
      peak = Math.max(peak, active)
      await new Promise(resolve => setImmediate(resolve))
      active -= 1
      return wireResponse({ data: collection === 'products'
        ? { id, product_name: `Fixture ${id}`, producer_id: 500 + Math.floor((Number(id) - 1) / 2), product_category_id: 600 }
        : { id } })
    }
  })
  const reply = response()
  await cellar.listCellar(reply, user)
  assert.equal(reply.body.items.length, 24)
  assert.ok(reply.body.items.every(row => row.product?.id))
  assert.equal([...reads.keys()].filter(key => key.startsWith('products:')).length, 12)
  assert.equal([...reads.keys()].filter(key => key.startsWith('producers:')).length, 6)
  assert.equal(reads.get('categories:600'), 1)
  assert.ok([...reads.values()].every(count => count === 1))
  assert.ok(peak > 1 && peak <= 8, `Observed ${peak} concurrent metadata reads`)
})

test('missing product metadata preserves every verified cellar row', async context => {
  providerFixture(context, [item(1, { product_id: 12 }), item(2)], {
    recordResponse: () => wireResponse({ data: null })
  })
  const reply = response()
  await cellar.listCellar(reply, user)
  assert.deepEqual(reply.body.items.map(row => row.product), [null, null])
})

test('metadata deadline aborts optional reads and still returns verified rows', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let started
  const requestStarted = new Promise(resolve => { started = resolve })
  const calls = providerFixture(context, [item(1, { product_id: 12 })], {
    recordResponse: ({ options }) => new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
      started()
    })
  })
  const reply = response()
  const loading = cellar.listCellar(reply, user)
  await requestStarted
  context.mock.timers.tick(5_001)
  await loading
  assert.equal(reply.statusCode, 200)
  assert.equal(reply.body.items.length, 1)
  assert.equal(reply.body.items[0].product, null)
  assert.equal(calls.length, 2)
})

test('caller cancellation is honoured before any provider request', async context => {
  const calls = providerFixture(context, [item(1)])
  const controller = new AbortController()
  controller.abort()
  const reply = response()
  await assert.rejects(routeCellarRequest({ method: 'GET', query: { path: 'cellar' } }, reply, user,
    { signal: controller.signal }), { name: 'AbortError' })
  assert.equal(calls.length, 0)
  assert.equal(reply.body, null)
})
