import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider, __testables } from '../dataProvider.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NOCODEBACKEND_DATA_BASE_URL: process.env.NOCODEBACKEND_DATA_BASE_URL,
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY,
  NOCODEBACKEND_INSTANCE: process.env.NOCODEBACKEND_INSTANCE
}

const configure = () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://api.nocodebackend.com/'
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-secret'
  process.env.NOCODEBACKEND_INSTANCE = '54026_rating'
}

test.beforeEach(configure)
test.afterEach(() => { global.fetch = originalFetch })
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

test('list matches Swagger read route, instance query and bearer headers', async () => {
  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return response({ status: 'success', data: [{ id: 7 }] })
  }

  assert.deepEqual(await dataProvider.list('ratings', { user_id: 'owner' }), [{ id: 7 }])
  assert.equal(request.url, 'https://api.nocodebackend.com/read/ratings?Instance=54026_rating&user_id=owner')
  assert.deepEqual(request.options.headers, {
    accept: 'application/json',
    authorization: 'Bearer test-secret'
  })
})

test('hardcoded data fallback is api.nocodebackend.com', () => {
  assert.equal(__testables.DEFAULT_DATA_BASE_URL, 'https://api.nocodebackend.com/')
  assert.equal(__testables.resolveDataBaseUrl(undefined), 'https://api.nocodebackend.com')
})

test('configured data base URL is respected', () => {
  assert.equal(__testables.resolveDataBaseUrl('https://api.nocodebackend.com/'), 'https://api.nocodebackend.com')
  assert.throws(() => __testables.resolveDataBaseUrl('not-a-url'), { code: 'DATA_CONFIGURATION_INVALID' })
})

test('paginated product list uses documented search and ordering parameters', async () => {
  let requestedUrl
  const items = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }))
  global.fetch = async (url) => {
    requestedUrl = String(url)
    return response({ status: 'success', data: items, pagination: { page: 2, limit: 25, total: 51, total_pages: 3 } })
  }

  assert.deepEqual(await dataProvider.listPage('products', {
    search: 'porter', page: 2, limit: 25, orderBy: 'product_name', order: 'asc'
  }), { items, page: 2, pageSize: 25, total: 51, totalPages: 3 })
  assert.equal(requestedUrl,
    'https://api.nocodebackend.com/read/products?Instance=54026_rating&product_name%5Blike%5D=porter&page=2&limit=25&sort=product_name&order=asc')
})

test('get uses read-by-id and filtered fallback after 404', async () => {
  const urls = []
  global.fetch = async (url) => {
    urls.push(String(url))
    if (urls.length === 1) return response({ error: 'missing' }, { status: 404 })
    return response({ data: [{ id: 'id/with slash' }] })
  }

  assert.deepEqual(await dataProvider.get('ratings', 'id/with slash'), { id: 'id/with slash' })
  assert.deepEqual(urls, [
    'https://api.nocodebackend.com/read/ratings/id%2Fwith%20slash?Instance=54026_rating',
    'https://api.nocodebackend.com/read/ratings?Instance=54026_rating&id=id%2Fwith+slash'
  ])
})

test('create, update, compare-and-set and delete use operation routes and JSON content type', async () => {
  const requests = []
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    return response({ status: 'success', data: { id: 3 } })
  }

  await dataProvider.create('cellar', { product_id: 1 })
  await dataProvider.update('cellar', 3, { quantity: 2 })
  await dataProvider.compareAndSet('cellar', 3, 4, { version: 5 })
  await dataProvider.remove('cellar', 3)

  assert.deepEqual(requests.map(({ url, options }) => [url, options.method]), [
    ['https://api.nocodebackend.com/create/cellar?Instance=54026_rating', 'POST'],
    ['https://api.nocodebackend.com/update/cellar/3?Instance=54026_rating', 'PUT'],
    ['https://api.nocodebackend.com/update/cellar/3?Instance=54026_rating&expected_version=4', 'PUT'],
    ['https://api.nocodebackend.com/delete/cellar/3?Instance=54026_rating', 'DELETE']
  ])
  assert.equal(requests[0].options.headers['content-type'], 'application/json')
  assert.equal(requests[3].options.headers['content-type'], undefined)
  assert.ok(requests.every(({ options }) => options.headers.authorization === 'Bearer test-secret'))
  assert.ok(requests.every(({ options }) => options.headers.cookie === undefined))
  assert.ok(requests.every(({ options }) => options.headers.origin === undefined))
  assert.ok(requests.every(({ options }) => options.headers.referer === undefined))
  assert.ok(requests.every(({ options }) => options.headers['x-database-instance'] === undefined))
})

test('provider conflict and error responses remain machine-readable', async () => {
  global.fetch = async () => response({ error: 'private detail' }, { status: 409 })
  await assert.rejects(dataProvider.create('ratings', {}), { status: 409, code: 'UNIQUE_CONFLICT' })
  await assert.rejects(dataProvider.compareAndSet('ratings', 3, 4, {}), { status: 409, code: 'VERSION_CONFLICT' })

  global.fetch = async () => response({ error: 'forbidden' }, { status: 403 })
  await assert.rejects(dataProvider.list('products'), { status: 403, code: 'DATA_PROVIDER_FORBIDDEN' })

  global.fetch = async () => response({ status: 'error' })
  await assert.rejects(dataProvider.list('products'), { status: 502, code: 'PROVIDER_ERROR' })
})

test('missing NOCODEBACKEND_SECRET_KEY fails closed before provider request', async () => {
  delete process.env.NOCODEBACKEND_SECRET_KEY
  global.fetch = async () => assert.fail('fetch must not be called')
  await assert.rejects(dataProvider.list('products'), { status: 503, code: 'DATA_CREDENTIAL_MISSING' })
})
