import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'

const withProviderStubs = async (stubs, callback) => {
  const originals = { list: dataProvider.list, get: dataProvider.get }
  Object.assign(dataProvider, stubs)
  try {
    await callback()
  } finally {
    Object.assign(dataProvider, originals)
  }
}

const inSet = (value) => new Set(String(value || '').split(',').filter(Boolean))

test('catalogue checks authoritative product-producer relationships before falling back to legacy producer_id', async () => {
  const collectionsRead = []
  await withProviderStubs({
    async list(collection, filters = {}) {
      collectionsRead.push(collection)
      if (collection === 'product_producers') return []
      if (collection === 'producers') {
        const ids = inSet(filters['id[in]'])
        return [{ id: 49, producer_name: 'Backend Brewery' }].filter((record) => ids.has(String(record.id)))
      }
      if (collection === 'categories') {
        const ids = inSet(filters['id[in]'])
        return [{ id: 26, category_name: 'Double IPA' }].filter((record) => ids.has(String(record.id)))
      }
      return []
    }
  }, async () => {
    const [product] = await __testables.hydrateProducts([{
      id: 1,
      product_name: 'Exported beer',
      product_category_id: 26,
      producer_id: 49,
      collaboration: 0
    }])

    assert.equal(product.producer.producer_name, 'Backend Brewery')
    assert.deepEqual(product.producers.map((producer) => producer.producer_name), ['Backend Brewery'])
    assert.equal(product.category.category_name, 'Double IPA')
    assert.deepEqual(collectionsRead.sort(), ['categories', 'producers', 'product_producers'])
  })
})

test('zero or missing producer attribution remains unresolved instead of being fabricated', async () => {
  const collectionsRead = []
  await withProviderStubs({
    async list(collection) {
      collectionsRead.push(collection)
      return []
    }
  }, async () => {
    const products = await __testables.hydrateProducts([
      { id: 319, product_name: 'Can I Kick It', producer_id: 0, collaboration: 1 },
      { id: 187, product_name: 'Othello’s Curse', producer_id: null, collaboration: 0 }
    ])

    for (const product of products) {
      assert.equal(product.producer, null)
      assert.deepEqual(product.producers, [])
    }
    assert.equal(products[0].collaboration, 1)
    assert.deepEqual(collectionsRead, ['product_producers'])
  })
})

test('producer and category enrichment failures preserve the core product after authoritative attribution lookup succeeds', async () => {
  await withProviderStubs({
    async list(collection) {
      if (collection === 'product_producers') return []
      const error = new Error('provider unavailable')
      error.status = 502
      throw error
    }
  }, async () => {
    const [product] = await __testables.hydrateProducts([{
      id: 2,
      product_name: 'Core product',
      producer_id: 49,
      product_category_id: 26
    }])
    assert.equal(product.product_name, 'Core product')
    assert.equal(product.producer, null)
    assert.deepEqual(product.producers, [])
    assert.equal(product.category, null)
  })
})
