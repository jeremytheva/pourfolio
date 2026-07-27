import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isOwnedBy,
  projectProduct,
  sanitiseCellarInput,
  sanitiseProfileUpdates
} from '../dataPolicy.js'

test('profile updates use an explicit editable-field allowlist', () => {
  assert.deepEqual(
    sanitiseProfileUpdates({
      name: ' Jeremy ',
      description: ' Notes ',
      email: 'changed@example.com',
      type: 'Admin User',
      user_id: 'other'
    }),
    { name: 'Jeremy', description: 'Notes' }
  )
})

test('blank profile names are rejected', () => {
  assert.throws(() => sanitiseProfileUpdates({ name: '  ' }), /name is required/)
})

test('cellar ownership and server fields are stripped from browser input', () => {
  const result = sanitiseCellarInput({
    product_id: 12,
    quantity: 2,
    user_id: 'other',
    secret_key: 'secret'
  })
  assert.deepEqual(result, { product_id: 12, quantity: 2 })
})

test('optional cellar series relationships are normalised to null', () => {
  const result = sanitiseCellarInput({
    product_id: 12,
    sharing_series_id: '',
    series_version_id: null
  })
  assert.equal(result.sharing_series_id, null)
  assert.equal(result.series_version_id, null)
})

test('zero is not accepted as a fabricated optional relationship id', () => {
  assert.throws(
    () => sanitiseCellarInput({ product_id: 12, sharing_series_id: 0 }),
    /must be null/
  )
})

test('cellar numeric bounds prevent negative quantities and prices', () => {
  assert.throws(() => sanitiseCellarInput({ product_id: 12, quantity: -1 }), /minimum/)
  assert.throws(() => sanitiseCellarInput({ product_id: 12, purchase_price: -0.01 }), /minimum/)
})

test('public product projection removes provider secrets and owner ids', () => {
  const product = projectProduct(
    { id: 1, product_name: 'Beer', secret_key: 'hidden', user_id: 'private' },
    { id: 2, producer_name: 'Producer', secret_key: 'hidden' }
  )
  assert.equal(product.secret_key, undefined)
  assert.equal(product.user_id, undefined)
  assert.equal(product.producer.secret_key, undefined)
})

test('ownership checks require an exact user id match', () => {
  assert.equal(isOwnedBy({ user_id: 'abc' }, 'abc'), true)
  assert.equal(isOwnedBy({ user_id: 'abc' }, 'ABC'), false)
  assert.equal(isOwnedBy(null, 'abc'), false)
})
