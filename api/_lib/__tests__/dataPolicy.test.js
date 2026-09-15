import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isOwnedBy,
  projectProduct,
  sanitiseCellarInput,
  sanitiseProductCreateInput,
  sanitiseProducerCreateInput,
  sanitiseProfileUpdates
} from '../dataPolicy.js'
import { CELLAR_GATED_RELATIONSHIP_FIELDS } from '../../../src/data/contract.js'

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

test('product creation accepts a verified producer relationship and strips browser ownership fields', () => {
  assert.deepEqual(sanitiseProductCreateInput({
    product_name: '  Launch   Lager ',
    product_category_id: 11,
    producer_id: 21,
    abv: '5.25',
    ibu: '32',
    declared_category: ' Lager ',
    edition: ' 2026 ',
    collaboration: true,
    product_image: 'https://example.com/beer.jpg',
    user_id: 'browser-user',
    id: 999
  }), {
    product_name: 'Launch Lager',
    product_category_id: '11',
    producer_id: '21',
    new_producer: null,
    abv: 5.25,
    ibu: '32',
    declared_category: 'Lager',
    edition: '2026',
    collaboration: 1,
    product_image: 'https://example.com/beer.jpg'
  })
})

test('product creation accepts one new producer and does not accept a competing producer id', () => {
  assert.deepEqual(sanitiseProductCreateInput({
    product_name: 'New Beer',
    product_category_id: '10',
    new_producer: { producer_name: '  New   Brewing  ' }
  }), {
    product_name: 'New Beer',
    product_category_id: '10',
    producer_id: null,
    new_producer: { producer_name: 'New Brewing' },
    abv: null,
    ibu: null,
    declared_category: null,
    edition: null,
    collaboration: 0,
    product_image: null
  })

  assert.throws(() => sanitiseProductCreateInput({
    product_name: 'New Beer',
    product_category_id: '10',
    producer_id: '20',
    new_producer: { producer_name: 'New Brewing' }
  }), (error) => error.status === 400 && /Choose one existing producer/.test(error.message))

  assert.throws(() => sanitiseProductCreateInput({
    product_name: 'New Beer',
    product_category_id: '10'
  }), (error) => error.status === 400 && /Choose one existing producer/.test(error.message))
})

test('product creation enforces product-table bounds and safe image urls', () => {
  const base = { product_name: 'Beer', product_category_id: 10, producer_id: 20 }
  assert.throws(() => sanitiseProductCreateInput({ ...base, abv: 81 }), /ABV must be between 0 and 80/)
  assert.throws(() => sanitiseProductCreateInput({ ...base, ibu: -1 }), /IBU must be a number/)
  assert.throws(() => sanitiseProductCreateInput({ ...base, product_image: 'http://example.com/a.jpg' }), /must use HTTPS/)
  assert.throws(() => sanitiseProductCreateInput({ ...base, collaboration: 'yes' }), /Collaboration flag is invalid/)
  assert.equal(sanitiseProductCreateInput({ ...base, product_image: '/images/a.jpg' }).product_image, '/images/a.jpg')
})

test('producer creation keeps only supported producer fields', () => {
  assert.deepEqual(sanitiseProducerCreateInput({
    producer_name: '  Test   Brewing ',
    address: '  1 Test Street ',
    suburb_id: 55,
    user_id: 'browser-user'
  }), {
    producer_name: 'Test Brewing',
    address: '1 Test Street'
  })
  assert.throws(() => sanitiseProducerCreateInput({ producer_name: '  ' }), /Producer name is required/)
})

test('cellar ownership and server fields are stripped from browser input', () => {
  const result = sanitiseCellarInput({
    product_id: 12,
    quantity: 2,
    user_id: 'other',
    secret_key: 'secret'
  })
  assert.deepEqual(result, { product_id: '12', quantity: 2 })
})

test('partial cellar updates distinguish an omitted product from an invalid supplied product', () => {
  assert.deepEqual(sanitiseCellarInput({ notes: 'Still cellared' }, { partial: true }), {
    notes: 'Still cellared'
  })

  for (const product_id of [null, '', '  ', 0, '0', 'not-an-id', -1, 1.5]) {
    assert.throws(
      () => sanitiseCellarInput({ product_id }, { partial: true }),
      /Product identifier is invalid/
    )
  }

  assert.deepEqual(
    sanitiseCellarInput({ product_id: ' 42 ' }, { partial: true }),
    { product_id: '42' }
  )
})

test('gated cellar relationships normalise empty values to null', () => {
  const input = { product_id: 12 }
  CELLAR_GATED_RELATIONSHIP_FIELDS.forEach((field, index) => {
    input[field] = index % 2 ? '' : null
  })
  const result = sanitiseCellarInput(input)
  for (const field of CELLAR_GATED_RELATIONSHIP_FIELDS) assert.equal(result[field], null)
})

test('non-null gated cellar relationships fail closed until lookup ownership is verified', () => {
  for (const field of CELLAR_GATED_RELATIONSHIP_FIELDS) {
    assert.throws(
      () => sanitiseCellarInput({ product_id: 12, [field]: 9 }),
      (error) => error.status === 400 && error.message.includes(`Cellar relationship ${field} is unavailable`)
    )
  }
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
