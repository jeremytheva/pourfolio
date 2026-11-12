import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'
import { styleService } from '../../../src/services/styleService.js'
import { validateCatalogueCategoryPage } from '../../../src/services/catalogueResponse.js'

const originalListPage = dataProvider.listPage

test.afterEach(() => {
  dataProvider.listPage = originalListPage
})

const recorder = () => {
  const result = { statusCode: null, body: null }
  const response = {
    status(code) { result.statusCode = code; return this },
    json(body) { result.body = body; return this }
  }
  return { result, response }
}

test('canonical categories are paginated independently of existing products and projected without provider privacy metadata', async () => {
  let requests = []
  dataProvider.listPage = async (collection, options) => {
    requests.push({ collection, ...options })
    assert.equal(collection, COLLECTIONS.categories)
    assert.equal(options.orderBy, 'category_name')
    assert.equal(options.order, 'asc')
    return {
      items: [{ id: 314, category_name: 'Witbier', parent_id: null, user_id: 'internal-owner', secret_key: 'private' }],
      page: 1, pageSize: 100, total: 1, totalPages: 1
    }
  }
  const { response, result } = recorder()
  await __testables.listCategories({ query: { page: '1', limit: '100' } }, response)
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, {
    items: [{ id: 314, category_name: 'Witbier', parent_id: null }],
    page: 1, pageSize: 100, total: 1, totalPages: 1, pagination: 'exact', hasMore: false
  })
  assert.equal(requests.length, 1)
})

test('category lookup does not suppress or invent provider failures', async () => {
  dataProvider.listPage = async () => { throw new Error('category provider unavailable') }
  const { response } = recorder()
  await assert.rejects(__testables.listCategories({ query: { page: '1' } }, response), /category provider unavailable/)
})

// Exercise the real generated-data adapter, gateway, browser contract and service.
// No HTTP request is allowed to escape this synthetic transport.
const realAdapterFixture = (context, rows, { exact = false, providerResponse } = {}) => {
  const env = { NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
    NOCODEBACKEND_SECRET_KEY: 'synthetic-category-secret', NOCODEBACKEND_INSTANCE: 'synthetic-category-instance' }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  const previousWindow = globalThis.window
  Object.assign(process.env, env)
  globalThis.window = { setTimeout, clearTimeout }
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    globalThis.window = previousWindow
  })
  for (const method of ['create', 'update', 'remove']) {
    context.mock.method(dataProvider, method, () => assert.fail('Category reads must not mutate provider records.'))
  }
  const pages = [], publicPages = []
  context.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const text = String(url), parsed = new URL(text, 'https://example.test')
    assert.equal(options.method || 'GET', 'GET')
    if (text.startsWith('/api/nocodebackend/catalog/categories?')) {
      const { result, response } = recorder()
      try {
        await __testables.listCategories({ query: Object.fromEntries(parsed.searchParams) }, response)
        publicPages.push(result.body)
        return new Response(JSON.stringify(result.body), { status: 200 })
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Synthetic category read failure.', code: error.code }), { status: error.status || 500 })
      }
    }
    assert.equal(parsed.origin, 'https://api.nocodebackend.com')
    assert.equal(parsed.pathname, '/read/categories')
    const page = Number(parsed.searchParams.get('page')), limit = Number(parsed.searchParams.get('limit'))
    assert.equal(limit, 100)
    pages.push(page)
    const items = rows.slice((page - 1) * limit, page * limit)
    if (providerResponse) return providerResponse({ page, limit, items })
    return new Response(JSON.stringify(exact ? {
      data: items, pagination: { page, per_page: limit, total: rows.length, total_pages: Math.ceil(rows.length / limit) }
    } : { data: items }), { status: 200 })
  })
  return { pages, publicPages }
}
const categoryRows = count => Array.from({ length: count }, (_, index) => ({
  id: index + 1, category_name: `Synthetic category ${String(index + 1).padStart(4, '0')}`, parent_id: null,
  secret_key: 'synthetic-private-category-metadata'
}))

for (const count of [201, 200]) {
  test(`metadata-free ${count}-row category transport completes without inventing exact totals`, async context => {
    const { pages, publicPages } = realAdapterFixture(context, categoryRows(count))
    const styles = await styleService.listCanonicalStyleOptions()
    assert.equal(styles.length, count)
    assert.equal(styles.at(-1).style.id, count)
    assert.equal(new Set(styles.map(({ style }) => String(style.id))).size, count)
    assert.deepEqual(pages, [1, 2, 3])
    assert.deepEqual(publicPages.map(page => [page.pagination, page.hasMore, page.total, page.totalPages]), [
      ['continuation', true, null, null], ['continuation', true, null, null], ['continuation', false, null, null]
    ])
    assert.equal(publicPages.at(-1).items.length, count % 100)
    publicPages.forEach(page => validateCatalogueCategoryPage(page, { expectedPage: page.page, expectedPageSize: 100 }))
    assert.equal(JSON.stringify(styles).includes('synthetic-private-category-metadata'), false)
  })
}

test('actual exact adapter totals remain exact and complete at an exact page boundary', async context => {
  const { pages, publicPages } = realAdapterFixture(context, categoryRows(200), { exact: true })
  assert.equal((await styleService.listCanonicalStyleOptions()).length, 200)
  assert.deepEqual(pages, [1, 2])
  assert.deepEqual(publicPages.map(page => [page.pagination, page.hasMore, page.total, page.totalPages]), [
    ['exact', true, 200, 2], ['exact', false, 200, 2]
  ])
})

test('a later generated-data failure rejects the complete category lookup', async context => {
  const { pages } = realAdapterFixture(context, categoryRows(201), {
    providerResponse: ({ page, items }) => new Response(JSON.stringify(page === 2 ? { error: 'synthetic provider failure' } : { data: items }), { status: page === 2 ? 503 : 200 })
  })
  await assert.rejects(styleService.listCanonicalStyleOptions(), error => error.status === 503)
  assert.deepEqual(pages, [1, 2])
})

test('malformed generated category rows cannot become a silently shortened terminal page', async context => {
  const { pages } = realAdapterFixture(context, [categoryRows(1)[0], null])
  await assert.rejects(styleService.listCanonicalStyleOptions(), /invalid catalogue data/i)
  assert.deepEqual(pages, [1])
})
