import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider, __testables } from '../dataProvider.js'
import { withDataRequestContext } from '../dataRequestContext.js'

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

test('managed Lambda receives session cookie and application origin but never the server secret', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  process.env.NOCODEBACKEND_SECRET_KEY = 'server-only-secret'

  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return response({ data: [{ id: 1 }] })
  }

  await withDataRequestContext({
    headers: {
      cookie: 'better-auth.session_token=session-value',
      host: 'pourfolio.example.com',
      'x-forwarded-proto': 'https'
    }
  }, async () => {
    assert.deepEqual(await dataProvider.list('products'), [{ id: 1 }])
  })

  assert.equal(request.url, 'https://example.lambda-url.us-east-2.on.aws/data/read/products?Instance=54026_rating')
  assert.equal(request.options.headers.authorization, undefined)
  assert.equal(request.options.headers.cookie, 'better-auth.session_token=session-value')
  assert.equal(request.options.headers.origin, 'https://pourfolio.example.com')
})

test('request context remains isolated across concurrent managed-proxy calls', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://example.lambda-url.us-east-2.on.aws/data'
  process.env.NOCODEBACKEND_SECRET_KEY = 'server-only-secret'

  const cookies = []
  global.fetch = async (_url, options) => {
    cookies.push(options.headers.cookie)
    await Promise.resolve()
    return response({ data: [] })
  }

  await Promise.all([
    withDataRequestContext({ headers: { cookie: 'session=a', host: 'a.example.com' } }, () => dataProvider.list('products')),
    withDataRequestContext({ headers: { cookie: 'session=b', host: 'b.example.com' } }, () => dataProvider.list('products'))
  ])

  assert.deepEqual(new Set(cookies), new Set(['session=a', 'session=b']))
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
  assert.equal(headers.cookie, undefined)
})
