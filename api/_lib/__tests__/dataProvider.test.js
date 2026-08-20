import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider, __testables } from '../dataProvider.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NCB_DATA_API_URL: process.env.NCB_DATA_API_URL,
  NCB_SECRET_KEY: process.env.NCB_SECRET_KEY,
  NCB_INSTANCE: process.env.NCB_INSTANCE,
  NOCODEBACKEND_DATA_BASE_URL: process.env.NOCODEBACKEND_DATA_BASE_URL,
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY,
  NOCODEBACKEND_INSTANCE: process.env.NOCODEBACKEND_INSTANCE
}

test.beforeEach(() => {
  delete process.env.NCB_DATA_API_URL
  delete process.env.NCB_SECRET_KEY
  delete process.env.NCB_INSTANCE
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://app.nocodebackend.com/api/data'
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-secret'
  process.env.NOCODEBACKEND_INSTANCE = '54026_rating'
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

test('list uses the generated table read route, instance selector and server bearer auth', async () => {
  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return response({ status: 'success', data: [{ id: 7 }] })
  }

  assert.deepEqual(await dataProvider.list('ratings', { user_id: 'owner', ignored: '' }), [{ id: 7 }])
  assert.equal(request.url, 'https://app.nocodebackend.com/api/data/read/ratings?Instance=54026_rating&user_id=owner')
  assert.equal(request.options.method, 'GET')
  assert.equal(request.options.headers.authorization, 'Bearer test-secret')
  assert.equal(request.options.headers['x-database-instance'], '54026_rating')
  assert.equal(request.options.headers.cookie, undefined)
})

test('NCB environment names are preferred when supplied', async () => {
  process.env.NCB_DATA_API_URL = 'https://app.nocodebackend.com/api/data'
  process.env.NCB_SECRET_KEY = 'ncb-secret'
  process.env.NCB_INSTANCE = '54026_rating'
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://wrong.example.test'
  process.env.NOCODEBACKEND_SECRET_KEY = 'wrong-secret'
  process.env.NOCODEBACKEND_INSTANCE = 'wrong-instance'

  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return response({ status: 'success', data: [] })
  }

  assert.deepEqual(await dataProvider.list('products'), [])
  assert.equal(request.url, 'https://app.nocodebackend.com/api/data/read/products?Instance=54026_rating')
  assert.equal(request.options.headers.authorization, 'Bearer ncb-secret')
})

test('legacy Lambda configuration is automatically bypassed in favour of the configured NCB data API root', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  let requestedUrl
  global.fetch = async (url) => {
    requestedUrl = String(url)
    return response({ status: 'success', data: [] })
  }

  assert.equal(__testables.looksLikeLegacyLambdaProxy(process.env.NOCODEBACKEND_DATA_BASE_URL), true)
  assert.deepEqual(await dataProvider.list('products'), [])
  assert.equal(requestedUrl, 'https://app.nocodebackend.com/api/data/read/products?Instance=54026_rating')
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

test('paginated product list uses documented column search, sort, order, page and limit parameters', async () => {
  let requestedUrl
  const items = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }))
  global.fetch = async (url) => {
    requestedUrl = String(url)
    return response({
      status: 'success',
      data: items,
      pagination: { page: 2, limit: 25, total: 51, total_pages: 3 }
    })
  }

  assert.deepEqual(await dataProvider.listPage('products', {
    search: 'porter', page: 2, limit: 25, orderBy: 'product_name', order: 'asc'
  }), { items, page: 2, pageSize: 25, total: 51, totalPages: 3 })
  assert.equal(requestedUrl,
    'https://app.nocodebackend.com/api/data/read/products?Instance=54026_rating&product_name%5Blike%5D=porter&page=2&limit=25&sort=product_name&order=asc')
})

test('paginated list remains usable when the provider omits pagination metadata', async () => {
  global.fetch = async () => response({ status: 'success', data: [{ id: 1 }, { id: 2 }] })
  assert.deepEqual(await dataProvider.listPage('products', {
    page: 1, limit: 24, orderBy: 'product_name'
  }), {
    items: [{ id: 1 }, { id: 2 }],
    page: 1,
    pageSize: 24,
    total: 2,
    totalPages: 1,
    totalIsEstimate: false
  })

  global.fetch = async () => response({ status: 'success', data: Array.from({ length: 24 }, (_, index) => ({ id: index + 1 })) })
  const fullPage = await dataProvider.listPage('products', { page: 1, limit: 24, orderBy: 'product_name' })
  assert.equal(fullPage.total, 25)
  assert.equal(fullPage.totalPages, 2)
  assert.equal(fullPage.totalIsEstimate, true)
})

test('paginated list still fails closed on inconsistent explicit metadata', async () => {
  global.fetch = async () => response({
    data: [{ id: 1 }],
    pagination: { page: 1, limit: 2, total: 3, total_pages: 2 }
  })
  await assert.rejects(dataProvider.listPage('products', {
    page: 1, limit: 2, orderBy: 'product_name'
  }), { status: 502, code: 'PROVIDER_ERROR' })
})

test('get uses generated read-by-id route and filtered fallback after 404', async () => {
  const urls = []
  global.fetch = async (url) => {
    urls.push(String(url))
    if (urls.length === 1) return response({ error: 'missing' }, { status: 404 })
    return response({ data: [{ id: 'id/with slash' }] })
  }

  assert.deepEqual(await dataProvider.get('ratings', 'id/with slash'), { id: 'id/with slash' })
  assert.deepEqual(urls, [
    'https://app.nocodebackend.com/api/data/read/ratings/id%2Fwith%20slash?Instance=54026_rating',
    'https://app.nocodebackend.com/api/data/read/ratings?Instance=54026_rating&id=id%2Fwith+slash'
  ])
})

test('get rejects a provider record whose id does not match the requested record', async () => {
  global.fetch = async () => response({ data: { id: 8 } })
  await assert.rejects(dataProvider.get('products', 7), { status: 502, code: 'PROVIDER_ERROR' })
})

test('create, update, compare-and-set and delete use generated operation routes', async () => {
  const requests = []
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    return response({ status: 'success', data: { id: 3 } })
  }

  await dataProvider.create('cellar', { product_id: 1 })
  await dataProvider.update('cellar', 3, { quantity: 2 })
  await dataProvider.compareAndSet('cellar', 3, 4, { version: 5 })
  await dataProvider.remove('cellar', 3)

  assert.deepEqual(requests.map(({ url, options }) => [url, options.method, options.body]), [
    ['https://app.nocodebackend.com/api/data/create/cellar?Instance=54026_rating', 'POST', '{"product_id":1}'],
    ['https://app.nocodebackend.com/api/data/update/cellar/3?Instance=54026_rating', 'PUT', '{"quantity":2}'],
    ['https://app.nocodebackend.com/api/data/update/cellar/3?Instance=54026_rating&expected_version=4', 'PUT', '{"version":5}'],
    ['https://app.nocodebackend.com/api/data/delete/cellar/3?Instance=54026_rating', 'DELETE', undefined]
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

test('provider error envelopes and malformed responses fail closed', async () => {
  global.fetch = async () => response({ status: 'error', message: 'private detail' })
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

test('missing secret fails closed without making a provider request', async () => {
  delete process.env.NCB_SECRET_KEY
  delete process.env.NOCODEBACKEND_SECRET_KEY
  global.fetch = async () => assert.fail('fetch must not be called')
  await assert.rejects(dataProvider.list('products'), {
    status: 503,
    code: 'DATA_CONFIGURATION_MISSING'
  })
})
