import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'

const enabled = process.env.RUN_NOCODEBACKEND_PROVIDER_SMOKE === '1'

const requireConnectedConfiguration = () => {
  const secret = process.env.NCB_SECRET_KEY || process.env.NOCODEBACKEND_SECRET_KEY
  assert.ok(secret, 'NCB_SECRET_KEY or NOCODEBACKEND_SECRET_KEY is required for connected provider smoke testing')
}

test('connected NoCodeBackend generated table API read contract is usable for launch collections', { skip: !enabled }, async () => {
  requireConnectedConfiguration()

  const page = await dataProvider.listPage('products', {
    page: 1,
    limit: 1,
    orderBy: 'product_name',
    order: 'asc'
  })
  assert.ok(Array.isArray(page.items))
  assert.equal(page.page, 1)
  assert.equal(page.pageSize, 1)
  assert.ok(Number.isSafeInteger(page.total) && page.total >= 0)
  assert.ok(Number.isSafeInteger(page.totalPages) && page.totalPages >= 0)

  const mandatoryCollections = [
    'profiles',
    'cellar',
    'rating_attributes',
    'bonus_attributes',
    'producers',
    'categories',
    'ratings'
  ]

  for (const collection of mandatoryCollections) {
    const records = await dataProvider.list(collection)
    assert.ok(Array.isArray(records), `${collection} must return a list-compatible response`)
  }

  if (process.env.EXPECT_PRODUCT_PRODUCERS === '1') {
    const productProducers = await dataProvider.list('product_producers')
    assert.ok(Array.isArray(productProducers), 'product_producers must return a list-compatible response when deployment is expected')
  }
})
