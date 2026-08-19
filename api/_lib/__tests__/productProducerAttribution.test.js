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

test('catalogue exposes every attributed collaboration producer while retaining a primary producer', async () => {
  await withProviderStubs({
    async list(collection, filters) {
      if (collection === 'product_producers' && String(filters.product_id) === '319') {
        return [
          { id: 1, product_id: 319, producer_id: 114, is_primary: 1 },
          { id: 2, product_id: 319, producer_id: 85, is_primary: 0 }
        ]
      }
      return []
    },
    async get(collection, id) {
      const records = {
        producers: {
          114: { id: 114, producer_name: 'Range' },
          85: { id: 85, producer_name: 'Kicks Brewing' }
        },
        categories: {
          26: { id: 26, category_name: 'Double IPA' }
        }
      }
      return records[collection]?.[id] || null
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
    async list(collection) {
      if (collection === 'product_producers') {
        const error = new Error('not found')
        error.status = 404
        throw error
      }
      return []
    },
    async get(collection, id) {
      if (collection === 'producers' && String(id) === '49') return { id: 49, producer_name: 'Legacy Brewery' }
      return null
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
