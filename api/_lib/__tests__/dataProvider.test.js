import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider, __testables } from '../dataProvider.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NOCODEBACKEND_DATA_BASE_URL: process.env.NOCODEBACKEND_DATA_BASE_URL,
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY
}

test.beforeEach(() => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://provider.example.test/data/'
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-secret'
})

test.afterEach(() => {
  global.fetch = originalFetch
})

test.after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

const response = (payload, { status = 200, raw } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => raw ?? (payload === null ? '' : JSON.stringify(payload))
})

test('list uses the documented V2 resource path, bearer auth and equality filters', async () => {
  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return response({ records: [{ id: 7 }] })
  }

  assert.deepEqual(await dataProvider.list('ratings', { user_id: 'owner', ignored: '' }), [{ id: 7 }])
  assert.equal(request.url, 'https://provider.example.test/data/ratings?user_id=owner')
  assert.equal(request.options.method, 'GET')
  assert.equal(request.options.headers.authorization, 'Bearer test-secret')
  assert.equal(request.options.headers.cookie, undefined)
})

test('list normalises supported provider list envelopes', async () => {
  const envelopes = [
    [{ data: [{ id: 1 }] }, [{ id: 1 }]],
    [{ records: [{ id: 2 }] }, [{ id: 2 }]],
    [{ items: [{ id: 3 }] }, [{ id: 3 }]],
    [{ results: [{ id: 4 }] }, [{ id: 4 }]],
    [[{ id: 5 }], [{ id: 5 }]],
    [{ data: null }, []]
  ]

  for (const [payload, expected] of envelopes) {
    global.fetch = async () => response(payload)
    assert.deepEqual(await dataProvider.list('products'), expected)
  }
})

test('paginated list uses search, page, limit and order_by from the certified contract', async () => {
  let requestedUrl
  const items = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }))
  global.fetch = async (url) => {
    requestedUrl = String(url)
    return response({
      items,
      pagination: { page: 2, pageSize: 25, total: 51, totalPages: 3 }
    })
  }

  assert.deepEqual(await dataProvider.listPage('products', {
    search: 'porter', page: 2, limit: 25, orderBy: 'product_name', order: 'asc'
  }), { items, page: 2, pageSize: 25, total: 51, totalPages: 3 })
  assert.equal(requestedUrl,
    'https://provider.example.test/data/products?search=porter&page=2&limit=25&order_by=product_name&order=asc')
})

test('paginated list fails closed on missing or inconsistent metadata', async () => {
  global.fetch = async () => response({ items: [] })
  await assert.rejects(dataProvider.listPage('products', {
    page: 1, limit: 24, orderBy: 'product_name'
  }), { status: 502, code: 'PROVIDER_ERROR' })

  global.fetch = async () => response({
    items: [{ id: 1 }],
    pagination: { page: 1, pageSize: 2, total: 3, totalPages: 2 }
  })
  await assert.rejects(dataProvider.listPage('products', {
    page: 1, limit: 2, orderBy: 'product_name'
  }), { status: 502, code: 'PROVIDER_ERROR' })
})

test('get uses the REST record path and filtered fallback after 404', async () => {
  const urls = []
  global.fetch = async (url) => {
    urls.push(String(url))
    if (urls.length === 1) return response({ error: 'missing' }, { status: 404 })
    return response({ items: [{ id: 'id/with slash' }] })
  }

  assert.deepEqual(await dataProvider.get('ratings', 'id/with slash'), { id: 'id/with slash' })
  assert.deepEqual(urls, [
    'https://provider.example.test/data/ratings/id%2Fwith%20slash',
    'https://provider.example.test/data/ratings?id=id%2Fwith+slash'
  ])
})

test('get rejects a provider record whose id does not match the requested record', async () => {
  global.fetch = async () => response({ data: { id: 8 } })
  await assert.rejects(dataProvider.get('products', 7), { status: 502, code: 'PROVIDER_ERROR' })
})

test('create, update, compare-and-set and delete use REST resource paths', async () => {
  const requests = []
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    return response({ data: { id: 3 } })
  }

  await dataProvider.create('cellar', { product_id: 1 })
  await dataProvider.update('cellar', 3, { quantity: 2 })
  await dataProvider.compareAndSet('cellar', 3, 4, { version: 5 })
  await dataProvider.remove('cellar', 3)

  assert.deepEqual(requests.map(({ url, options }) => [url, options.method, options.body]), [
    ['https://provider.example.test/data/cellar', 'POST', '{"product_id":1}'],
    ['https://provider.example.test/data/cellar/3', 'PUT', '{"quantity":2}'],
    ['https://provider.example.test/data/cellar/3?expected_version=4', 'PUT', '{"version":5}'],
    ['https://provider.example.test/data/cellar/3', 'DELETE', undefined]
  ])
  assert.ok(requests.every(({ options }) => options.headers.authorization === 'Bearer test-secret'))
})

test('unique and stale-version conflicts remain machine-readable without leaking provider details', async () => {
  global.fetch = async () => response({ error: 'private provider detail' }, { status: 409 })

  await assert.rejects(dataProvider.create('ratings', {}), (error) => {
    assert.equal(error.status, 409)
    assert.equal(error.code, 'UNIQUE_CONFLICT')
    assert.equal(dataProvider.isUniqueConflict(error), true)
    assert.doesNotMatch(error.message, /private provider detail/)
    return true
  })

  await assert.rejects(dataProvider.compareAndSet('ratings', 3, 4, { submission_version: 5 }), (error) => {
    assert.equal(error.status, 409)
    assert.equal(error.code, 'VERSION_CONFLICT')
    assert.equal(dataProvider.isUniqueConflict(error), false)
    return true
  })
})

test('provider success=false and malformed responses fail closed', async () => {
  global.fetch = async () => response({ success: false, message: 'private detail' })
  await assert.rejects(dataProvider.list('products'), { status: 502, code: 'PROVIDER_ERROR' })

  global.fetch = async () => response(null, { raw: '<html>failure</html>' })
  await assert.rejects(dataProvider.list('products'), { status: 502, code: 'PROVIDER_ERROR' })
})

test('upstream network failures become safe gateway errors', async () => {
  global.fetch = async () => { throw new Error('private network detail') }
  await assert.rejects(dataProvider.list('products'), (error) => {
    assert.equal(error.status, 502)
    assert.equal(error.code, 'PROVIDER_ERROR')
    assert.doesNotMatch(error.message, /private network detail/)
    return true
  })
})

test('missing server configuration fails closed without making a provider request', async () => {
  delete process.env.NOCODEBACKEND_SECRET_KEY
  global.fetch = async () => assert.fail('fetch must not be called')
  await assert.rejects(dataProvider.list('products'), {
    status: 503,
    code: 'DATA_CONFIGURATION_MISSING'
  })
})

test('legacy Lambda data proxy configuration is rejected explicitly', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  global.fetch = async () => assert.fail('legacy proxy must not be called')

  assert.equal(__testables.looksLikeLegacyLambdaProxy(process.env.NOCODEBACKEND_DATA_BASE_URL), true)
  await assert.rejects(dataProvider.list('products'), {
    status: 503,
    code: 'DATA_PROVIDER_LEGACY_PROXY'
  })
})
