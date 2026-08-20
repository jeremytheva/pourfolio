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

test('catalogue exposes every attributed collaboration producer while retaining a primary producer', async () => {
  await withProviderStubs({
    async list(collection, filters = {}) {
      if (collection === 'product_producers') {
        const ids = inSet(filters['product_id[in]'])
        if (!ids.has('319')) return []
        return [
          { id: 1, product_id: 319, producer_id: 114, is_primary: 1 },
          { id: 2, product_id: 319, producer_id: 85, is_primary: 0 }
        ]
      }
      if (collection === 'producers') {
        const ids = inSet(filters['id[in]'])
        return [
          { id: 114, producer_name: 'Range' },
          { id: 85, producer_name: 'Kicks Brewing' }
        ].filter((record) => ids.has(String(record.id)))
      }
      if (collection === 'categories') {
        const ids = inSet(filters['id[in]'])
        return [{ id: 26, category_name: 'Double IPA' }].filter((record) => ids.has(String(record.id)))
      }
      return []
    }
  }, async () => {
    const [product] = await __testables.hydrateProducts([{
      id: 319,
      product_name: 'Can I Kick It',
      product_category_id: 26,
      producer_id: 0,
      collaboration: 1
    }])

    assert.equal(product.producer.producer_name, 'Range')
    assert.deepEqual(product.producers.map((producer) => producer.producer_name), ['Range', 'Kicks Brewing'])
  })
})

test('catalogue remains compatible before the junction collection is deployed', async () => {
  await withProviderStubs({
    async list(collection, filters = {}) {
      if (collection === 'product_producers') {
        const error = new Error('not found')
        error.status = 404
        throw error
      }
      if (collection === 'producers') {
        const ids = inSet(filters['id[in]'])
        return [{ id: 49, producer_name: 'Legacy Brewery' }].filter((record) => ids.has(String(record.id)))
      }
      return []
    }
  }, async () => {
    const [product] = await __testables.hydrateProducts([{
      id: 1,
      product_name: 'Legacy beer',
      producer_id: 49,
      collaboration: 0
    }])
    assert.equal(product.producer.producer_name, 'Legacy Brewery')
    assert.deepEqual(product.producers.map((producer) => producer.producer_name), ['Legacy Brewery'])
  })
})

test('optional collaboration enrichment denial does not make core products unavailable', async () => {
  await withProviderStubs({
    async list(collection, filters = {}) {
      if (collection === 'product_producers') {
        const error = new Error('forbidden')
        error.status = 403
        throw error
      }
      if (collection === 'producers') {
        const ids = inSet(filters['id[in]'])
        return [{ id: 49, producer_name: 'Legacy Brewery' }].filter((record) => ids.has(String(record.id)))
      }
      return []
    }
  }, async () => {
    const [product] = await __testables.hydrateProducts([{
      id: 1,
      product_name: 'Still visible',
      producer_id: 49,
      collaboration: 1
    }])
    assert.equal(product.product_name, 'Still visible')
    assert.equal(product.producer.producer_name, 'Legacy Brewery')
  })
})

test('secondary producer and category enrichment failures preserve the core product payload', async () => {
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
