import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError } from '../../lib/nocodeBackend.js'
import { validateCatalogueProducer, CATALOGUE_RESPONSE_ERROR } from '../catalogueResponse.js'
import { producerService, normaliseCatalogueProducerId, CATALOGUE_PRODUCER_ID_ERROR } from '../producerService.js'

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
