import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError } from '../../lib/nocodeBackend.js'
import {
  beverageService,
  CATALOGUE_PRODUCT_ID_ERROR,
  normaliseCatalogueProductId
} from '../beverageService.js'
import {
  CATALOGUE_RESPONSE_ERROR,
  validateCataloguePage,
  validateCatalogueProduct
} from '../catalogueResponse.js'

const product = {
  id: 4,
  product_name: 'Ace',
  product_category_id: '10',
  producer_id: 20,
  abv: '5.2',
  ibu: 35,
  declared_category: 'Pale Ale',
  edition: null,
  collaboration: 0,
  product_image: 'https://images.example.test/ace.webp',
  producer: { id: '20', producer_name: 'Rocky Ridge Brewing', address: '', suburb_id: 9567 },
  category: { id: 10, category_name: 'Pale Ale', parent_id: null }
}

const secondProduct = {
  ...product,
  id: '5',
  product_name: 'Aftermath',
  product_image: null
}

const page = {
  items: [product, secondProduct],
  page: 1,
  pageSize: 24,
  total: 2,
  totalPages: 1
}

const detail = {
  ...product,
  ratingSummary: { count: 2, average: 4.75 },
  ratings: []
}

const isSafeCatalogueError = (error) => {
  assert.equal(error instanceof ApiError, true)
  assert.equal(error.message, CATALOGUE_RESPONSE_ERROR.message)
  assert.equal(error.code, CATALOGUE_RESPONSE_ERROR.code)
  assert.equal(error.status, 502)
  return true
}

const isInvalidProductIdError = (error) => {
  assert.equal(error instanceof ApiError, true)
  assert.equal(error.message, CATALOGUE_PRODUCT_ID_ERROR.message)
  assert.equal(error.code, CATALOGUE_PRODUCT_ID_ERROR.code)
  assert.equal(error.status, 400)
  return true
}

test('validates and deeply freezes a catalogue page without mutating its input', () => {
  const input = structuredClone(page)
  const original = structuredClone(input)
  const result = validateCataloguePage(input)

  assert.deepEqual(result, original)
  assert.deepEqual(input, original)
  assert.notEqual(result, input)
  assert.notEqual(result.items[0], input.items[0])
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.items), true)
  assert.equal(Object.isFrozen(result.items[0].producer), true)
  assert.equal(Object.isFrozen(input), false)

  input.items[0].product_name = 'Changed after validation'
  assert.equal(result.items[0].product_name, 'Ace')
})

test('accepts the canonical empty first page', () => {
  assert.deepEqual(validateCataloguePage({
    items: [], page: 1, pageSize: 24, total: 0, totalPages: 0
  }), {
    items: [], page: 1, pageSize: 24, total: 0, totalPages: 0
  })
})

test('canonicalises empty optional numeric and relationship wire values to null', () => {
  const result = validateCataloguePage({
    items: [{
      ...product,
      product_category_id: '',
      producer_id: '',
      abv: '',
      ibu: '',
      product_image: '',
      producer: null,
      category: null
    }],
    page: 1,
    pageSize: 24,
    total: 1,
    totalPages: 1
  })

  assert.equal(result.items[0].product_category_id, null)
  assert.equal(result.items[0].producer_id, null)
  assert.equal(result.items[0].abv, null)
  assert.equal(result.items[0].ibu, null)
  assert.equal(result.items[0].product_image, '')
})

test('rejects malformed envelopes, pagination and duplicate stable identifiers', () => {
  const malformedPages = [
    null,
    [],
    { ...page, privateProviderValue: 'must not pass' },
    { ...page, items: {} },
    { ...page, page: '1' },
    { ...page, page: 0 },
    { ...page, page: 2 },
    { ...page, pageSize: 101 },
    { ...page, totalPages: 2 },
    { ...page, items: [product] },
    { ...page, items: [product, { ...secondProduct, id: '4' }] },
    { items: [], page: 1, pageSize: 24, total: 0 }
  ]

  for (const malformed of malformedPages) {
    assert.throws(() => validateCataloguePage(malformed), isSafeCatalogueError)
  }
  assert.throws(() => validateCataloguePage(page, { expectedPage: 2, expectedPageSize: 24 }), isSafeCatalogueError)
  assert.throws(() => validateCataloguePage(page, { expectedPage: 1, expectedPageSize: 25 }), isSafeCatalogueError)
})

test('rejects unrenderable product values and inconsistent public relationships', () => {
  const malformedProducts = [
    { ...product, id: 0 },
    { ...product, id: '01' },
    { ...product, product_name: '   ' },
    { ...product, declared_category: { private: true } },
    { ...product, abv: 'not-a-number' },
    { ...product, ibu: Number.POSITIVE_INFINITY },
    { ...product, product_image: 'http://images.example.test/ace.webp' },
    { ...product, provider_secret: 'never expose this' },
    { ...product, producer: { id: 21, producer_name: 'Wrong producer' } },
    { ...product, category: { id: 10, category_name: '' } }
  ]

  for (const malformed of malformedProducts) {
    assert.throws(() => validateCataloguePage({
      items: [malformed], page: 1, pageSize: 24, total: 1, totalPages: 1
    }), isSafeCatalogueError)
  }
})

test('validates aggregate-only product details and canonicalises an omitted ratings array', () => {
  const withoutRatings = structuredClone(detail)
  delete withoutRatings.ratings
  const result = validateCatalogueProduct(withoutRatings)

  assert.deepEqual(result, detail)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.ratingSummary), true)
  assert.equal(Object.isFrozen(result.ratings), true)
  assert.deepEqual(withoutRatings, {
    ...product,
    ratingSummary: { count: 2, average: 4.75 }
  })
})

test('binds a successful product detail to the requested stable identifier', () => {
  assert.deepEqual(validateCatalogueProduct(detail, { expectedProductId: '4' }), detail)
  assert.deepEqual(validateCatalogueProduct(detail, { expectedProductId: 4 }), detail)
  assert.throws(() => validateCatalogueProduct(detail, { expectedProductId: '5' }), isSafeCatalogueError)
})

test('rejects malformed aggregates and individual rating records from public details', () => {
  const malformedDetails = [
    product,
    { ...detail, ratingSummary: null },
    { ...detail, ratingSummary: { count: '2', average: 4.75 } },
    { ...detail, ratingSummary: { count: 0, average: 4 } },
    { ...detail, ratingSummary: { count: 1, average: null } },
    { ...detail, ratingSummary: { count: 1, average: 0 } },
    { ...detail, ratingSummary: { count: 1, average: 8 } },
    { ...detail, ratingSummary: { count: 1, average: Number.NaN } },
    { ...detail, ratings: [{ id: 'private-rating-id', cellar_id: 'private-cellar-id' }] },
    { ...detail, user_id: 'private-owner-id' }
  ]

  for (const malformed of malformedDetails) {
    assert.throws(() => validateCatalogueProduct(malformed), isSafeCatalogueError)
  }
})

test('fails safely on hidden, symbolic and accessor values without echoing supplied data', () => {
  const secret = 'provider-secret-that-must-not-escape'
  const malformed = { ...detail, provider_secret: secret }
  Object.defineProperty(malformed, 'hidden', { value: secret, enumerable: false })
  Object.defineProperty(malformed, 'accessor', {
    enumerable: true,
    get() {
      throw new Error(secret)
    }
  })
  malformed[Symbol(secret)] = true

  assert.throws(() => validateCatalogueProduct(malformed), (error) => {
    isSafeCatalogueError(error)
    assert.doesNotMatch(error.message, new RegExp(secret))
    assert.equal(JSON.stringify(error).includes(secret), false)
    return true
  })
})

test('both beverage service reads enforce the catalogue response boundary', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async (url) => {
    requests.push(String(url))
    const payload = String(url).includes('?') ? page : detail
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    assert.deepEqual(await beverageService.getProducts({ search: ' pale ale ', page: 1 }), page)
    assert.deepEqual(await beverageService.getProduct(4), detail)
    assert.deepEqual(requests, [
      '/api/nocodebackend/catalog/products?page=1&limit=24&q=pale+ale',
      '/api/nocodebackend/catalog/products/4'
    ])

    assert.equal(normaliseCatalogueProductId(4), '4')
    assert.equal(normaliseCatalogueProductId('4'), '4')
    for (const invalidId of [0, -1, 1.5, Number.NaN, '04', ' 4 ', '4/5', '', null, {}]) {
      assert.throws(() => normaliseCatalogueProductId(invalidId), isInvalidProductIdError)
      await assert.rejects(beverageService.getProduct(invalidId), isInvalidProductIdError)
    }
    assert.equal(requests.length, 2)

    globalThis.fetch = async () => new Response(JSON.stringify({ ...detail, id: 5 }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
    await assert.rejects(beverageService.getProduct(4), isSafeCatalogueError)

    globalThis.fetch = async () => new Response(JSON.stringify({ privateProviderValue: 'do not echo' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
    await assert.rejects(beverageService.getProducts(), isSafeCatalogueError)
    await assert.rejects(beverageService.getProduct(4), isSafeCatalogueError)
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
