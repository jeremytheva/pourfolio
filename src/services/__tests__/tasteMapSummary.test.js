import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTasteMapSummary } from '../tasteMapSummary.js'

const paleAle = { id: 10, category_name: 'Pale Ale' }
const stout = { id: 11, category_name: 'Stout' }
const rockyRidge = { id: 20, producer_name: 'Rocky Ridge Brewing' }
const alpha = { id: 30, producer_name: 'Alpha Brewing' }

const product = (overrides = {}) => ({
  id: 4,
  product_name: 'Ace',
  product_category_id: 10,
  producer_id: 20,
  category: paleAle,
  producer: rockyRidge,
  ...overrides
})

const rating = (id, item) => ({ id, rating_id: id, product_id: item.id, product: item })

test('summarises tastings separately from unique beers and groups verified styles/breweries', () => {
  const ace = product()
  const bravo = product({ id: 5, product_name: 'Bravo' })
  const dark = product({ id: 6, product_name: 'Dark', product_category_id: 11, category: stout, producer_id: 30, producer: alpha })

  const summary = buildTasteMapSummary({ items: [
    rating(1, ace),
    rating(2, ace),
    rating(3, bravo),
    rating(4, dark)
  ] })

  assert.equal(summary.tastingCount, 4)
  assert.equal(summary.uniqueProductCount, 3)
  assert.equal(summary.styleCount, 2)
  assert.equal(summary.breweryCount, 2)
  assert.deepEqual(summary.styles, [
    { id: '10', name: 'Pale Ale', tastingCount: 3, uniqueProductCount: 2 },
    { id: '11', name: 'Stout', tastingCount: 1, uniqueProductCount: 1 }
  ])
  assert.deepEqual(summary.breweries, [
    { id: '20', name: 'Rocky Ridge Brewing', tastingCount: 3, uniqueProductCount: 2 },
    { id: '30', name: 'Alpha Brewing', tastingCount: 1, uniqueProductCount: 1 }
  ])
})

test('counts missing or relationship-inconsistent metadata as unknown without inferring it', () => {
  const unknownStyle = product({ id: 7, product_name: 'Unknown style', product_category_id: null, category: null })
  const mismatchedStyle = product({ id: 8, product_name: 'Mismatch', product_category_id: 11, category: paleAle })
  const unknownProducer = product({ id: 9, product_name: 'Unknown brewery', producer_id: null, producer: null })
  const mismatchedProducer = product({ id: 10, product_name: 'Producer mismatch', producer_id: 30, producer: rockyRidge })

  const summary = buildTasteMapSummary({ items: [
    rating(1, unknownStyle),
    rating(2, unknownStyle),
    rating(3, mismatchedStyle),
    rating(4, unknownProducer),
    rating(5, mismatchedProducer)
  ] })

  assert.equal(summary.tastingCount, 5)
  assert.equal(summary.uniqueProductCount, 4)
  assert.equal(summary.unknownStyleTastingCount, 3)
  assert.equal(summary.unknownStyleProductCount, 2)
  assert.equal(summary.unknownProducerTastingCount, 2)
  assert.equal(summary.unknownProducerProductCount, 2)
})

test('ignores malformed rating/product relationships instead of inventing history', () => {
  const ace = product()
  const summary = buildTasteMapSummary({ items: [
    rating(1, ace),
    { id: 2, product_id: 5, product: ace },
    { id: 3, product_id: 4, product: { ...ace, id: '04' } },
    { id: 4, product_id: 4, product: { ...ace, product_name: '' } },
    null
  ] })

  assert.equal(summary.tastingCount, 1)
  assert.equal(summary.uniqueProductCount, 1)
})

test('returns a frozen empty summary for absent history', () => {
  const summary = buildTasteMapSummary(null)
  assert.deepEqual(summary, {
    tastingCount: 0,
    uniqueProductCount: 0,
    styleCount: 0,
    breweryCount: 0,
    unknownStyleTastingCount: 0,
    unknownStyleProductCount: 0,
    unknownProducerTastingCount: 0,
    unknownProducerProductCount: 0,
    styles: [],
    breweries: []
  })
  assert.equal(Object.isFrozen(summary), true)
  assert.equal(Object.isFrozen(summary.styles), true)
  assert.equal(Object.isFrozen(summary.breweries), true)
})
