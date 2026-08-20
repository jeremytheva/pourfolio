import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider, __testables } from '../dataProvider.js'

const enabled = process.env.RUN_NOCODEBACKEND_PROVIDER_SMOKE === '1'

const requireConnectedConfiguration = () => {
  const baseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL
  const secret = process.env.NOCODEBACKEND_SECRET_KEY
  assert.ok(baseUrl, 'NOCODEBACKEND_DATA_BASE_URL is required for connected provider smoke testing')
  assert.ok(secret, 'NOCODEBACKEND_SECRET_KEY is required for connected provider smoke testing')
  assert.equal(
    __testables.looksLikeLegacyLambdaProxy(baseUrl),
    false,
    'NOCODEBACKEND_DATA_BASE_URL must target the generated NoCodeBackend V2 REST API, not the legacy Lambda proxy'
  )
}

test('connected NoCodeBackend V2 read contract is usable for launch collections', { skip: !enabled }, async () => {
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
