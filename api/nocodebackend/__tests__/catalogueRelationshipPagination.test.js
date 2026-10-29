import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables as catalogue } from '../../catalog-data-proxy.js'
import { DEPLOYED_COLLECTIONS as C } from '../../../src/data/contract.js'

const original = { ...dataProvider }
test.afterEach(() => Object.assign(dataProvider, original))

const products = Array.from({ length: 101 }, (_, i) => ({
  id: i + 1, product_name: `Beer ${i + 1}`, producer_id: i + 1, product_category_id: i + 1001
}))
const producers = products.map(({ producer_id: id }) => ({ id, producer_name: `Brewery ${id}`, user_id: 'private-owner' }))
const categories = products.map(({ product_category_id: id }) => ({ id, category_name: `Style ${id}` }))

const installPages = (tables, failOn = () => false) => {
  const calls = []
  const failure = new Error('Later relationship page unavailable')
  // Reproduce the provider-default list truncation independently of paged reads.
  dataProvider.list = async (collection) => (tables[collection] || []).slice(0, 10)
  dataProvider.listPage = async (collection, options) => {
    calls.push({ collection, ...options })
    if (failOn(collection, options.page)) throw failure
    const rows = tables[collection] || []
    const { page, limit } = options
    return {
      items: rows.slice((page - 1) * limit, page * limit), page, pageSize: limit,
      total: rows.length, totalPages: Math.ceil(rows.length / limit)
    }
  }
  return { calls, failure }
}

test('product hydration retains producers and styles beyond the default and explicit first pages', async () => {
  const { calls } = installPages({ [C.producers]: producers, [C.categories]: categories })
  const result = await catalogue.hydrateProducts(products)
  assert.equal(result.length, 101)
  assert.equal(result.filter(p => p.producer).length, 101)
  assert.equal(result.filter(p => p.category).length, 101)
  assert.equal(result.at(-1).producer.producer_name, 'Brewery 101')
  assert.equal(result.at(-1).category.category_name, 'Style 1101')
  assert.equal(Object.hasOwn(result.at(-1).producer, 'user_id'), false)
  for (const collection of [C.producers, C.categories]) {
    const pages = calls.filter(c => c.collection === collection)
    assert.deepEqual(pages.map(c => c.page), [1, 2])
    assert.ok(pages.every(c => c.limit === 100 && c.orderBy === 'id' && c.order === 'asc'))
    assert.equal(pages[0].filters['id[in]'].split(',').length, 101)
    assert.deepEqual(pages[1].filters, pages[0].filters)
  }
})

test('late-page collaboration retains its primary producer and excludes unrelated mappings', async () => {
  const relationships = producers.map((p, i) => ({
    id: i + 1, product_id: 7, producer_id: p.id, is_primary: p.id === 101 ? 1 : 0, sort_order: i + 1
  }))
  relationships.push({ id: 102, product_id: 999, producer_id: 777, is_primary: 1 })
  const { calls } = installPages({ [C.productProducers]: relationships, [C.producers]: producers })
  const [result] = await catalogue.hydrateProducts([{ id: 7, product_name: 'Collaboration', producer_id: 101 }])
  assert.equal(result.producer.id, 101)
  assert.equal(result.producer_id, 101)
  assert.equal(result.producers.length, 101)
  assert.equal(result.producers.some(p => p.id === 777 || p.id === 999), false)
  assert.equal(result.collaboration, 1)
  const pages = calls.filter(c => c.collection === C.productProducers)
  assert.deepEqual(pages.map(c => c.page), [1, 2])
  assert.ok(pages.every(c => c.filters['product_id[in]'] === '7'))
})

test('catalogue list and detail agree for brewery and style records on later pages', async () => {
  const pageProducts = products.slice(90).map((p, i) => ({ ...p, id: i + 1 }))
  installPages({ [C.products]: pageProducts, [C.producers]: producers, [C.categories]: categories })
  dataProvider.get = async (collection, id) => {
    assert.equal(collection, C.products)
    return pageProducts.find(p => String(p.id) === String(id))
  }
  const capture = () => ({ status() { return this }, json(body) { this.body = body } })
  const list = capture()
  await catalogue.listProducts({ query: { page: '1', limit: '24' } }, list)
  const detail = capture()
  await catalogue.getProduct('11', detail)
  assert.equal(list.body.items.length, 11)
  assert.equal(list.body.items.at(-1).producer.producer_name, 'Brewery 101')
  assert.equal(list.body.items.at(-1).category.category_name, 'Style 1101')
  assert.deepEqual(list.body.items.at(-1).producer, detail.body.producer)
  assert.deepEqual(list.body.items.at(-1).category, detail.body.category)
})

test('a later authoritative mapping failure rejects hydration instead of using the legacy producer', async () => {
  const mappings = producers.map((p, i) => ({ id: i + 1, product_id: 7, producer_id: p.id }))
  const { failure } = installPages({ [C.productProducers]: mappings }, (c, page) => c === C.productProducers && page === 2)
  await assert.rejects(catalogue.hydrateProducts([{ id: 7, producer_id: 999 }]), e => e === failure)
})

test('an optional lookup failure discards its partial pages while other complete relationships survive', async () => {
  installPages({ [C.producers]: producers, [C.categories]: categories }, (c, page) => c === C.producers && page === 2)
  const result = await catalogue.hydrateProducts(products)
  assert.ok(result.every(p => p.producer === null && p.producers.length === 0))
  assert.equal(result.filter(p => p.category).length, 101)
})
