import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError } from '../../lib/nocodeBackend.js'
import { validateCatalogueProducer, CATALOGUE_RESPONSE_ERROR } from '../catalogueResponse.js'
import {
  producerService,
  normaliseCatalogueProducerId,
  CATALOGUE_PRODUCER_ID_ERROR,
  __testables
} from '../producerService.js'

const producer = { id: 20, producer_name: 'Rocky Ridge Brewing', address: '', suburb_id: 9567 }
const product = {
  id: 4,
  product_name: 'Ace',
  product_category_id: 10,
  producer_id: 20,
  abv: 5.2,
  ibu: 35,
  declared_category: 'Pale Ale',
  edition: null,
  collaboration: 0,
  product_image: null,
  producer,
  producers: [producer],
  category: { id: 10, category_name: 'Pale Ale', parent_id: null }
}
const detail = { producer, products: [product] }

const isSafeCatalogueError = (error) => {
  assert.equal(error instanceof ApiError, true)
  assert.equal(error.message, CATALOGUE_RESPONSE_ERROR.message)
  assert.equal(error.code, CATALOGUE_RESPONSE_ERROR.code)
  assert.equal(error.status, 502)
  return true
}

const isInvalidProducerIdError = (error) => {
  assert.equal(error instanceof ApiError, true)
  assert.equal(error.message, CATALOGUE_PRODUCER_ID_ERROR.message)
  assert.equal(error.code, CATALOGUE_PRODUCER_ID_ERROR.code)
  assert.equal(error.status, 400)
  return true
}

test('validates and freezes verified producer detail', () => {
  const result = validateCatalogueProducer(structuredClone(detail), { expectedProducerId: '20' })
  assert.deepEqual(result, detail)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.producer), true)
  assert.equal(Object.isFrozen(result.products), true)
  assert.equal(Object.isFrozen(result.products[0]), true)
})

test('accepts a verified producer with no linked products', () => {
  assert.deepEqual(validateCatalogueProducer({ producer, products: [] }, { expectedProducerId: 20 }), { producer, products: [] })
})

test('rejects mismatched or fabricated producer relationships', () => {
  const malformed = [
    { producer, products: [{ ...product, producer_id: 21, producer: { id: 21, producer_name: 'Other' }, producers: [{ id: 21, producer_name: 'Other' }] }] },
    { producer, products: [{ ...product, producer: null, producers: [] }] },
    { producer, products: [{ ...product, producer_id: 20, producer: { id: 21, producer_name: 'Other' } }] },
    { producer, products: [product, { ...product }] },
    { producer: { ...producer, website: 'https://invented.example' }, products: [] },
    { producer, products: [], privateProviderValue: true }
  ]
  for (const payload of malformed) assert.throws(() => validateCatalogueProducer(payload), isSafeCatalogueError)
  assert.throws(() => validateCatalogueProducer(detail, { expectedProducerId: 21 }), isSafeCatalogueError)
})

test('normalises only canonical positive producer IDs', () => {
  assert.equal(normaliseCatalogueProducerId(20), '20')
  assert.equal(normaliseCatalogueProducerId('20'), '20')
  for (const invalid of [0, -1, 1.5, Number.NaN, '020', ' 20 ', '20/21', '', null, {}]) {
    assert.throws(() => normaliseCatalogueProducerId(invalid), isInvalidProducerIdError)
  }
})

test('producer service uses the same-origin catalogue route and enforces response validation', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async (url) => {
    requests.push(String(url))
    return new Response(JSON.stringify(detail), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    assert.deepEqual(await producerService.getProducer(20), detail)
    assert.deepEqual(requests, ['/api/nocodebackend/catalog/producers/20'])

    globalThis.fetch = async () => new Response(JSON.stringify({
      producer,
      products: [{ ...product, producer_id: 21 }]
    }), { status: 200, headers: { 'content-type': 'application/json' } })
    await assert.rejects(producerService.getProducer(20), isSafeCatalogueError)
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('verified brewery index includes only exact product relationships and counts attributed beers', () => {
  const otherProducer = { id: 30, producer_name: 'Alpha Brewing', address: 'Main Street', suburb_id: null }
  const result = __testables.verifiedProducerIndexFromProducts([
    product,
    { ...product, id: 5, product_name: 'Bravo' },
    { ...product, id: 6, product_name: 'Charlie', producer_id: 30, producer: otherProducer, producers: [otherProducer] },
    { ...product, id: 7, product_name: 'Unattributed', producer_id: null, producer: null, producers: [] }
  ])

  assert.deepEqual(result, [
    { producer: otherProducer, productCount: 1 },
    { producer, productCount: 2 }
  ])
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result[0]), true)
})

test('verified brewery discovery traverses every validated catalogue page', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.window = { setTimeout, clearTimeout }

  const makeProduct = (id) => ({
    ...product,
    id,
    product_name: `Beer ${id}`
  })
  const firstPage = Array.from({ length: __testables.VERIFIED_PRODUCER_PAGE_SIZE }, (_, index) => makeProduct(index + 1))
  const secondPage = [makeProduct(__testables.VERIFIED_PRODUCER_PAGE_SIZE + 1)]

  globalThis.fetch = async (url) => {
    requests.push(String(url))
    const page = Number(new URL(String(url), 'https://example.test').searchParams.get('page'))
    const items = page === 1 ? firstPage : secondPage
    return new Response(JSON.stringify({
      items,
      page,
      pageSize: __testables.VERIFIED_PRODUCER_PAGE_SIZE,
      total: __testables.VERIFIED_PRODUCER_PAGE_SIZE + 1,
      totalPages: 2
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    assert.deepEqual(await producerService.listVerifiedProducers(), [
      { producer, productCount: __testables.VERIFIED_PRODUCER_PAGE_SIZE + 1 }
    ])
    assert.deepEqual(requests, [
      `/api/nocodebackend/catalog/products?page=1&limit=${__testables.VERIFIED_PRODUCER_PAGE_SIZE}`,
      `/api/nocodebackend/catalog/products?page=2&limit=${__testables.VERIFIED_PRODUCER_PAGE_SIZE}`
    ])
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
