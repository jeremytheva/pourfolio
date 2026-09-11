import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError } from '../../lib/nocodeBackend.js'
import {
  styleService,
  normaliseCatalogueStyleId,
  CATALOGUE_STYLE_ID_ERROR,
  STYLE_CATALOGUE_ERROR,
  __testables
} from '../styleService.js'

const producer = { id: 20, producer_name: 'Rocky Ridge Brewing', address: '', suburb_id: 9567 }
const paleAle = { id: 10, category_name: 'Pale Ale', parent_id: null }
const stout = { id: 11, category_name: 'Stout', parent_id: null }
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
  category: paleAle
}

const isInvalidStyleIdError = (error) => {
  assert.equal(error instanceof ApiError, true)
  assert.equal(error.message, CATALOGUE_STYLE_ID_ERROR.message)
  assert.equal(error.code, CATALOGUE_STYLE_ID_ERROR.code)
  assert.equal(error.status, 400)
  return true
}

const isStyleCatalogueError = (error) => {
  assert.equal(error instanceof ApiError, true)
  assert.equal(error.message, STYLE_CATALOGUE_ERROR.message)
  assert.equal(error.code, STYLE_CATALOGUE_ERROR.code)
  assert.equal(error.status, 502)
  return true
}

test('normalises only canonical positive style IDs', () => {
  assert.equal(normaliseCatalogueStyleId(10), '10')
  assert.equal(normaliseCatalogueStyleId('10'), '10')
  for (const invalid of [0, -1, 1.5, Number.NaN, '010', ' 10 ', '10/11', '', null, {}]) {
    assert.throws(() => normaliseCatalogueStyleId(invalid), isInvalidStyleIdError)
  }
})

test('style index uses only exact verified category relationships and counts unique breweries', () => {
  const otherProducer = { id: 30, producer_name: 'Alpha Brewing', address: '', suburb_id: null }
  const result = __testables.verifiedStyleIndexFromProducts([
    product,
    { ...product, id: 5, product_name: 'Bravo' },
    { ...product, id: 6, product_name: 'Dark', product_category_id: 11, category: stout, producer_id: 30, producer: otherProducer, producers: [otherProducer] },
    { ...product, id: 7, product_name: 'No style', product_category_id: null, category: null },
    { ...product, id: 8, product_name: 'Mismatched', product_category_id: 11, category: paleAle }
  ])

  assert.deepEqual(result, [
    { style: paleAle, productCount: 2, breweryCount: 1 },
    { style: stout, productCount: 1, breweryCount: 1 }
  ])
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result[0]), true)
  assert.equal(Object.isFrozen(result[0].style), true)
})

test('style detail returns exactly matching products and verified breweries in deterministic order', () => {
  const alpha = { id: 30, producer_name: 'Alpha Brewing', address: '', suburb_id: null }
  const detail = __testables.verifiedStyleDetailFromProducts([
    product,
    { ...product, id: 5, product_name: 'Bravo', producer_id: 30, producer: alpha, producers: [alpha] },
    { ...product, id: 6, product_name: 'Another', product_category_id: 11, category: stout },
    { ...product, id: 7, product_name: 'Unattributed', producer_id: null, producer: null, producers: [] }
  ], '10')

  assert.equal(detail.style.category_name, 'Pale Ale')
  assert.deepEqual(detail.products.map((item) => item.product_name), ['Ace', 'Bravo', 'Unattributed'])
  assert.deepEqual(detail.breweries.map((item) => item.producer_name), ['Alpha Brewing', 'Rocky Ridge Brewing'])
  assert.equal(Object.isFrozen(detail), true)
  assert.equal(Object.isFrozen(detail.products), true)
  assert.equal(Object.isFrozen(detail.breweries), true)
})

test('style discovery fails closed when one canonical style ID has conflicting catalogue metadata', () => {
  const conflicting = { id: 10, category_name: 'Not Pale Ale', parent_id: null }
  assert.throws(() => __testables.verifiedStyleIndexFromProducts([
    product,
    { ...product, id: 5, category: conflicting }
  ]), isStyleCatalogueError)
  assert.throws(() => __testables.verifiedStyleDetailFromProducts([
    product,
    { ...product, id: 5, category: conflicting }
  ], 10), isStyleCatalogueError)
})

test('verified style discovery traverses every validated catalogue page', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.window = { setTimeout, clearTimeout }

  const makeProduct = (id) => ({ ...product, id, product_name: `Beer ${id}` })
  const firstPage = Array.from({ length: __testables.VERIFIED_STYLE_PAGE_SIZE }, (_, index) => makeProduct(index + 1))
  const secondPage = [makeProduct(__testables.VERIFIED_STYLE_PAGE_SIZE + 1)]

  globalThis.fetch = async (url) => {
    requests.push(String(url))
    const page = Number(new URL(String(url), 'https://example.test').searchParams.get('page'))
    const items = page === 1 ? firstPage : secondPage
    return new Response(JSON.stringify({
      items,
      page,
      pageSize: __testables.VERIFIED_STYLE_PAGE_SIZE,
      total: __testables.VERIFIED_STYLE_PAGE_SIZE + 1,
      totalPages: 2
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    assert.deepEqual(await styleService.listVerifiedStyles(), [
      { style: paleAle, productCount: __testables.VERIFIED_STYLE_PAGE_SIZE + 1, breweryCount: 1 }
    ])
    const detail = await styleService.getStyle(10)
    assert.equal(detail.products.length, __testables.VERIFIED_STYLE_PAGE_SIZE + 1)
    assert.deepEqual(requests, [
      `/api/nocodebackend/catalog/products?page=1&limit=${__testables.VERIFIED_STYLE_PAGE_SIZE}`,
      `/api/nocodebackend/catalog/products?page=2&limit=${__testables.VERIFIED_STYLE_PAGE_SIZE}`,
      `/api/nocodebackend/catalog/products?page=1&limit=${__testables.VERIFIED_STYLE_PAGE_SIZE}`,
      `/api/nocodebackend/catalog/products?page=2&limit=${__testables.VERIFIED_STYLE_PAGE_SIZE}`
    ])
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('style detail reports a safe not-found response for unrepresented canonical IDs', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async () => new Response(JSON.stringify({
    items: [product],
    page: 1,
    pageSize: __testables.VERIFIED_STYLE_PAGE_SIZE,
    total: 1,
    totalPages: 1
  }), { status: 200, headers: { 'content-type': 'application/json' } })

  try {
    await assert.rejects(styleService.getStyle(99), (error) => {
      assert.equal(error instanceof ApiError, true)
      assert.equal(error.status, 404)
      assert.equal(error.code, 'style_not_found')
      assert.equal(error.message, 'Style not found.')
      return true
    })
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
