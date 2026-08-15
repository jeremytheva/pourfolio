import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'

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

test('list sends filters and normalises records envelope', async () => {
  const requests = []
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    return response({ records: [{ id: 7 }] })
  }

  assert.deepEqual(await dataProvider.list('ratings', { user_id: 'owner', ignored: '' }), [{ id: 7 }])
  assert.equal(requests[0].url, 'https://provider.example.test/data/ratings?user_id=owner')
  assert.equal(requests[0].options.method, 'GET')
  assert.equal(requests[0].options.headers.authorization, 'Bearer test-secret')
})


test('list normalises every supported list envelope', async () => {
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

test('paginated list sends documented search, page, limit and ordering parameters', async () => {
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

test('paginated list preserves empty search totals and rejects missing metadata', async () => {
  global.fetch = async () => response({ items: [], meta: { page: 1, limit: 100, total_count: 0, total_pages: 0 } })
  assert.deepEqual(await dataProvider.listPage('products', {
    search: 'no matches', page: 1, limit: 100, orderBy: 'product_name'
  }), { items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 })

  global.fetch = async () => response({ items: [] })
  await assert.rejects(dataProvider.listPage('products', {
    page: 1, limit: 24, orderBy: 'product_name'
  }), { status: 502, code: 'PROVIDER_ERROR' })
})

test('paginated list rejects response metadata or item counts for a different request boundary', async () => {
  const validItems = [{ id: 1 }, { id: 2 }]
  const malformedPages = [
    { items: validItems, pagination: { page: 2, pageSize: 2, total: 3, totalPages: 2 } },
    { items: validItems, pagination: { page: 1, pageSize: 3, total: 3, totalPages: 1 } },
    { items: validItems, pagination: { page: 1, pageSize: 2, total: 3, totalPages: 3 } },
    { items: [{ id: 1 }], pagination: { page: 1, pageSize: 2, total: 3, totalPages: 2 } },
    { items: [], pagination: { page: 1, pageSize: 2, total: 1, totalPages: 1 } }
  ]

  for (const payload of malformedPages) {
    global.fetch = async () => response(payload)
    await assert.rejects(dataProvider.listPage('products', {
      page: 1, limit: 2, orderBy: 'product_name'
    }), { status: 502, code: 'PROVIDER_ERROR' })
  }
})

test('get and writes normalise every supported single-record envelope', async () => {
  const envelopes = [
    [{ data: { id: 1 } }, { id: 1 }],
    [{ record: { id: 2 } }, { id: 2 }],
    [{ results: { id: 3 } }, { id: 3 }],
    [{ items: [{ id: 4 }] }, { id: 4 }],
    [{ records: [{ id: 5 }] }, { id: 5 }],
    [{ id: 6 }, { id: 6 }]
  ]

  for (const [payload, expected] of envelopes) {
    global.fetch = async () => response(payload)
    assert.deepEqual(await dataProvider.get('products', expected.id), expected)
    const created = await dataProvider.create('products', expected)
    assert.deepEqual(Array.isArray(created) ? created[0] : created, expected)
  }
})

test('provider success=false envelopes are treated as safe provider errors', async () => {
  global.fetch = async () => response({ success: false, message: 'private provider detail' }, { status: 200 })

  await assert.rejects(dataProvider.list('products'), (error) => {
    assert.equal(error.status, 502)
    assert.equal(error.code, 'PROVIDER_ERROR')
    assert.doesNotMatch(error.message, /private provider detail/)
    return true
  })
})

test('get uses the record path and falls back to a filtered list after not found', async () => {
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

test('get rejects a mismatched direct record and never accepts a mismatched fallback record', async () => {
  global.fetch = async () => response({ data: { id: 8 } })
  await assert.rejects(dataProvider.get('products', 7), { status: 502, code: 'PROVIDER_ERROR' })

  let requests = 0
  global.fetch = async () => {
    requests += 1
    return requests === 1
      ? response({ error: 'missing' }, { status: 404 })
      : response({ items: [{ id: 8 }] })
  }
  assert.equal(await dataProvider.get('products', 7), null)
})

test('create, update, compare-and-set and delete use the exact provider contract', async () => {
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
})

test('unique conflicts retain a safe status and machine-readable conflict code', async () => {
  global.fetch = async () => response({ error: 'provider detail must not escape' }, { status: 409 })

  await assert.rejects(dataProvider.create('ratings', {}), (error) => {
    assert.equal(error.status, 409)
    assert.equal(error.code, 'UNIQUE_CONFLICT')
    assert.equal(dataProvider.isUniqueConflict(error), true)
    assert.doesNotMatch(error.message, /provider detail/)
    return true
  })
})

test('the connected stale expected-version envelope is classified separately and redacted', async () => {
  global.fetch = async () => response({ error: 'The record has been modified by another request.' }, { status: 409 })

  await assert.rejects(dataProvider.compareAndSet('ratings', 3, 4, { submission_version: 5 }), (error) => {
    assert.equal(error.status, 409)
    assert.equal(error.code, 'VERSION_CONFLICT')
    assert.equal(dataProvider.isUniqueConflict(error), false)
    assert.doesNotMatch(error.message, /modified by another request/i)
    return true
  })
})

test('unrelated provider 4xx responses retain their upstream status', async () => {
  global.fetch = async () => response({ error: 'provider validation detail' }, { status: 422 })

  await assert.rejects(dataProvider.update('ratings', 3, {}), {
    status: 422,
    code: 'PROVIDER_ERROR'
  })
})

test('malformed responses and upstream failures become safe gateway errors', async () => {
  global.fetch = async () => response(null, { raw: '<html>failure</html>' })
  await assert.rejects(dataProvider.list('products'), { status: 502, code: 'PROVIDER_ERROR' })

  global.fetch = async () => { throw new Error('private network detail') }
  await assert.rejects(dataProvider.list('products'), (error) => {
    assert.equal(error.status, 502)
    assert.equal(error.code, 'PROVIDER_ERROR')
    assert.doesNotMatch(error.message, /private network detail/)
    return true
  })
})

test('response-body transport failures become safe gateway errors', async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => { throw new Error('private stream detail') }
  })

  await assert.rejects(dataProvider.list('products'), { status: 502, code: 'PROVIDER_ERROR' })
})

test('an aborted provider request becomes a safe gateway error', async () => {
  global.fetch = async (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('timed out', 'AbortError')), { once: true })
  })

  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  global.setTimeout = (callback) => {
    queueMicrotask(callback)
    return 1
  }
  global.clearTimeout = () => {}
  try {
    await assert.rejects(dataProvider.list('products'), { status: 502, code: 'PROVIDER_ERROR' })
  } finally {
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  }
})

test('missing server configuration fails closed without making a request', async () => {
  delete process.env.NOCODEBACKEND_SECRET_KEY
  global.fetch = async () => assert.fail('fetch must not be called')

  await assert.rejects(dataProvider.list('products'), { status: 503 })
})
