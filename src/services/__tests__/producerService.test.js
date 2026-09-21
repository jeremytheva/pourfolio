import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError } from '../../lib/nocodeBackend.js'
import { validateCatalogueProducer, CATALOGUE_RESPONSE_ERROR } from '../catalogueResponse.js'
import { PRODUCER_PAGE_RESPONSE_ERROR } from '../producerPageResponse.js'
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
const emptyPersonalStats = {
  ratingCount: 0,
  ratedBeerCount: 0,
  averageWeighted: null,
  averageUnweighted: null,
  unweightedRatingCount: 0,
  topBeers: []
}
const emptyCommunityStats = {
  catalogueBeerCount: 1,
  ratingCount: 0,
  ratedBeerCount: 0,
  averageWeighted: null,
  averageUnweighted: null,
  unweightedRatingCount: 0,
  attributes: [],
  topBeers: []
}
const detail = {
  producer,
  products: [product],
  communityStats: emptyCommunityStats,
  personalStats: emptyPersonalStats
}

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

test('accepts a verified producer with no linked products and truthful empty statistics', () => {
  const payload = {
    producer,
    products: [],
    communityStats: { ...emptyCommunityStats, catalogueBeerCount: 0 },
    personalStats: emptyPersonalStats
  }
  assert.deepEqual(validateCatalogueProducer(payload, { expectedProducerId: 20 }), payload)
})

test('accepts a product attributed to the viewed brewery as a collaborator', () => {
  const primary = { id: 21, producer_name: 'Other Brewing', address: '', suburb_id: null }
  const collaborationProduct = {
    ...product,
    producer_id: 21,
    collaboration: 1,
    producer: primary,
    producers: [primary, producer]
  }
  const result = validateCatalogueProducer({
    producer,
    products: [collaborationProduct],
    communityStats: emptyCommunityStats,
    personalStats: emptyPersonalStats
  }, { expectedProducerId: 20 })
  assert.deepEqual(result.products[0].producers, [primary, producer])
  assert.equal(result.products[0].producer.id, 21)
})

test('rejects mismatched, fabricated or inconsistent producer profile aggregates', () => {
  const malformed = [
    { ...detail, products: [{ ...product, producer_id: 21, producer: { id: 21, producer_name: 'Other' }, producers: [{ id: 21, producer_name: 'Other' }] }] },
    { ...detail, products: [{ ...product, producer: null, producers: [] }] },
    { ...detail, products: [{ ...product, producer_id: 20, producer: { id: 21, producer_name: 'Other' } }] },
    { ...detail, products: [product, { ...product }], communityStats: { ...emptyCommunityStats, catalogueBeerCount: 2 } },
    { ...detail, producer: { ...producer, website: 'https://invented.example' } },
    { ...detail, privateProviderValue: true },
    { ...detail, communityStats: { ...emptyCommunityStats, catalogueBeerCount: 2 } },
    { ...detail, communityStats: { ...emptyCommunityStats, ratingCount: 1, averageWeighted: null } },
    { ...detail, personalStats: { ...emptyPersonalStats, ratingCount: 1, averageWeighted: 4, ratedBeerCount: 1, topBeers: [{ productId: 4, productName: 'Wrong name', averageWeighted: 4, ratingCount: 1 }] } }
  ]
  for (const payload of malformed) assert.throws(() => validateCatalogueProducer(payload), isSafeCatalogueError)
  assert.throws(() => validateCatalogueProducer(detail, { expectedProducerId: 21 }), isSafeCatalogueError)
})

test('validates privacy-safe producer aggregates including core attributes and top beers', () => {
  const payload = {
    producer,
    products: [product],
    communityStats: {
      catalogueBeerCount: 1,
      ratingCount: 3,
      ratedBeerCount: 1,
      averageWeighted: 4.2,
      averageUnweighted: 4.1,
      unweightedRatingCount: 2,
      attributes: [
        { attributeId: 3, name: 'Aroma', average: 5.5, count: 2 },
        { attributeId: 7, name: 'Bonus', average: 1.25, count: 2 }
      ],
      topBeers: [{ productId: 4, productName: 'Ace', averageWeighted: 4.2, ratingCount: 3 }]
    },
    personalStats: {
      ratingCount: 1,
      ratedBeerCount: 1,
      averageWeighted: 4.5,
      averageUnweighted: 4.4,
      unweightedRatingCount: 1,
      topBeers: [{ productId: 4, productName: 'Ace', averageWeighted: 4.5, ratingCount: 1 }]
    }
  }

  const result = validateCatalogueProducer(structuredClone(payload), { expectedProducerId: 20 })
  assert.deepEqual(result, payload)
  assert.equal(Object.isFrozen(result.communityStats), true)
  assert.equal(Object.isFrozen(result.personalStats), true)
  assert.equal(Object.isFrozen(result.communityStats.attributes), true)

  assert.throws(() => validateCatalogueProducer({
    ...payload,
    communityStats: {
      ...payload.communityStats,
      attributes: [{ attributeId: 8, name: 'Design', average: 5, count: 1 }]
    }
  }), isSafeCatalogueError)
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
      ...detail,
      products: [{ ...product, producer_id: 21 }]
    }), { status: 200, headers: { 'content-type': 'application/json' } })
    await assert.rejects(producerService.getProducer(20), isSafeCatalogueError)
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('verified brewery page uses the producer discovery route and validates product counts', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async (url) => {
    requests.push(String(url))
    return new Response(JSON.stringify({
      items: [{ producer, productCount: 2 }],
      page: 1,
      pageSize: 24,
      total: 1,
      totalPages: 1
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    assert.deepEqual(await producerService.listVerifiedProducerPage({
      search: 'Rocky',
      page: 1,
      limit: 24
    }), {
      items: [{ producer, productCount: 2 }],
      page: 1,
      pageSize: 24,
      total: 1,
      totalPages: 1
    })
    assert.deepEqual(requests, [
      '/api/nocodebackend/catalog/producers?page=1&limit=24&hasProducts=true&q=Rocky'
    ])
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('verified brewery discovery traverses producer pages rather than product catalogue pages', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.window = { setTimeout, clearTimeout }

  const makeRow = (id) => ({
    producer: {
      id,
      producer_name: `Brewery ${String(id).padStart(3, '0')}`,
      address: '',
      suburb_id: null
    },
    productCount: 1
  })
  const firstPage = Array.from(
    { length: __testables.VERIFIED_PRODUCER_PAGE_SIZE },
    (_, index) => makeRow(index + 1)
  )
  const secondPage = [makeRow(__testables.VERIFIED_PRODUCER_PAGE_SIZE + 1)]

  globalThis.fetch = async (url) => {
    requests.push(String(url))
    const requestUrl = new URL(String(url), 'https://example.test')
    const page = Number(requestUrl.searchParams.get('page'))
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
    const result = await producerService.listVerifiedProducers()
    assert.equal(result.length, __testables.VERIFIED_PRODUCER_PAGE_SIZE + 1)
    assert.deepEqual(requests, [
      `/api/nocodebackend/catalog/producers?page=1&limit=${__testables.VERIFIED_PRODUCER_PAGE_SIZE}&hasProducts=true`,
      `/api/nocodebackend/catalog/producers?page=2&limit=${__testables.VERIFIED_PRODUCER_PAGE_SIZE}&hasProducts=true`
    ])
    assert.equal(requests.some((url) => url.includes('/catalog/products')), false)
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})


test('verified brewery page rejects malformed server product counts', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async () => new Response(JSON.stringify({
    items: [{ producer, productCount: 0 }],
    page: 1,
    pageSize: 24,
    total: 1,
    totalPages: 1
  }), { status: 200, headers: { 'content-type': 'application/json' } })

  try {
    await assert.rejects(
      producerService.listVerifiedProducerPage({ page: 1, limit: 24 }),
      (error) => {
        assert.equal(error instanceof ApiError, true)
        assert.equal(error.code, PRODUCER_PAGE_RESPONSE_ERROR.code)
        assert.equal(error.message, PRODUCER_PAGE_RESPONSE_ERROR.message)
        return true
      }
    )
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
