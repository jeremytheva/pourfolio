import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'

const enabled = process.env.RUN_NOCODEBACKEND_PROVIDER_SMOKE === '1'

const requireConnectedConfiguration = () => {
  const secret = process.env.NOCODEBACKEND_SECRET_KEY
  assert.ok(secret, 'NOCODEBACKEND_SECRET_KEY is required for connected provider smoke testing')
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

  for (const collection of ['profiles', 'cellar', 'rating_attributes', 'bonus_attributes']) {
    const records = await dataProvider.list(collection)
    assert.ok(Array.isArray(records), `${collection} must return a list-compatible response`)
  }
})
