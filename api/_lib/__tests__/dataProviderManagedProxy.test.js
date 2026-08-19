import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider, __testables } from '../dataProvider.js'

const originalFetch = global.fetch
const originalBaseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL
const originalSecret = process.env.NOCODEBACKEND_SECRET_KEY

const response = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload)
})

test.afterEach(() => {
  global.fetch = originalFetch
  if (originalBaseUrl === undefined) delete process.env.NOCODEBACKEND_DATA_BASE_URL
  else process.env.NOCODEBACKEND_DATA_BASE_URL = originalBaseUrl
  if (originalSecret === undefined) delete process.env.NOCODEBACKEND_SECRET_KEY
  else process.env.NOCODEBACKEND_SECRET_KEY = originalSecret
})

test('managed Lambda data proxy is detected explicitly', () => {
  assert.equal(__testables.usesManagedDataProxy('https://example.lambda-url.us-east-2.on.aws/data'), true)
  assert.equal(__testables.usesManagedDataProxy('https://api.nocodebackend.com/data'), false)
})

test('server secret is not forwarded to the managed Lambda data proxy', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  process.env.NOCODEBACKEND_SECRET_KEY = 'server-only-secret'

  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return response({ data: [{ id: 1 }] })
  }

  assert.deepEqual(await dataProvider.list('products'), [{ id: 1 }])
  assert.equal(request.url, 'https://example.lambda-url.us-east-2.on.aws/data/read/products?Instance=54026_rating')
  assert.equal(request.options.headers.authorization, undefined)
})

test('direct provider transport retains bearer authentication', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://api.nocodebackend.com/data'
  process.env.NOCODEBACKEND_SECRET_KEY = 'server-only-secret'

  let headers
  global.fetch = async (_url, options) => {
    headers = options.headers
    return response({ data: [{ id: 1 }] })
  }

  await dataProvider.list('products')
  assert.equal(headers.authorization, 'Bearer server-only-secret')
})
