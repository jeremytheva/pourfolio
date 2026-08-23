import assert from 'node:assert/strict'
import test from 'node:test'

import { dataProvider } from '../dataProvider.js'
import { runWithDataRequestContext } from '../dataRequestContext.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NOCODEBACKEND_DATA_BASE_URL: process.env.NOCODEBACKEND_DATA_BASE_URL,
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY,
  NOCODEBACKEND_INSTANCE: process.env.NOCODEBACKEND_INSTANCE
}

test.after(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('data request forwards authenticated session context required by NoCodeBackend', async () => {
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://api.nocodebackend.com/'
  process.env.NOCODEBACKEND_SECRET_KEY = 'server-secret'
  process.env.NOCODEBACKEND_INSTANCE = '54026_rating'

  let request
  global.fetch = async (url, options) => {
    request = { url: String(url), options }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'success', data: [{ id: 1 }] })
    }
  }

  const incoming = {
    headers: {
      cookie: 'theme=dark; __Secure-better-auth.session_token=session-value; analytics=123',
      origin: 'https://pourfolio.example.test'
    }
  }

  const result = await runWithDataRequestContext(incoming, () => dataProvider.list('products'))

  assert.deepEqual(result, [{ id: 1 }])
  assert.equal(request.url, 'https://api.nocodebackend.com/read/products?Instance=54026_rating')
  assert.equal(request.options.headers.authorization, 'Bearer server-secret')
  assert.equal(request.options.headers['x-database-instance'], '54026_rating')
  assert.equal(request.options.headers.cookie, '__Secure-better-auth.session_token=session-value')
  assert.equal(request.options.headers.origin, 'https://pourfolio.example.test')
  assert.equal(request.options.headers.referer, 'https://pourfolio.example.test/')
})
