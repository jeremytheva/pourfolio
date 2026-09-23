import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCatalogueDuplicateCandidates, __testables } from '../catalogueProposalDuplicates.js'

const products = [
  { id: 1, product_name: 'Hazy Pale', producer_id: 10, product_category_id: 20, edition: '2026' },
  { id: 2, product_name: 'Hazy Pale Ale', producer_id: 10, product_category_id: 20, edition: '2025' },
  { id: 3, product_name: 'Hazy Pale', producer_id: 11, product_category_id: 20, edition: '2026' },
  { id: 4, product_name: 'Hazy Pale', producer_id: 10, product_category_id: 21, edition: '2026' }
]

test('normalises proposal text deterministically', () => {
  assert.equal(__testables.normalise('  HAZY   Pale  '), 'hazy pale')
})

test('duplicate candidates require the same canonical producer', () => {
  const candidates = buildCatalogueDuplicateCandidates(products, {
    product_name: 'Hazy Pale',
    producer_id: 10,
    product_category_id: 20,
    edition: '2026'
  })

  assert.deepEqual(candidates.map(({ product }) => product.id), [1, 4, 2])
  assert.equal(candidates.some(({ product }) => product.id === 3), false)
})

test('duplicate matching fails closed when the proposal has no canonical producer', () => {
  const candidates = buildCatalogueDuplicateCandidates([
    ...products,
    { id: 5, product_name: 'Hazy Pale', producer_id: null, product_category_id: 20, edition: '2026' }
  ], {
    product_name: 'Hazy Pale',
    producer_id: null,
    product_category_id: 20,
    edition: '2026'
  })

  assert.deepEqual(candidates, [])
})

test('products without a canonical producer are never duplicate candidates', () => {
  const candidates = buildCatalogueDuplicateCandidates([
    ...products,
    { id: 5, product_name: 'Hazy Pale', producer_id: null, product_category_id: 20, edition: '2026' }
  ], {
    product_name: 'Hazy Pale',
    producer_id: 10,
    product_category_id: 20,
    edition: '2026'
  })

  assert.equal(candidates.some(({ product }) => product.id === 5), false)
})

test('exact name, style and edition signals rank the strongest candidate first', () => {
  const [candidate] = buildCatalogueDuplicateCandidates(products, {
    product_name: ' hazy pale ',
    producer_id: '10',
    product_category_id: '20',
    edition: '2026'
  })

  assert.equal(candidate.product.id, 1)
  assert.equal(candidate.exactName, true)
  assert.equal(candidate.styleMatch, true)
  assert.equal(candidate.editionMatch, true)
  assert.equal(candidate.editionConflict, false)
  assert.equal(candidate.strength, 8)
})

test('different editions remain visible but are marked as conflicts', () => {
  const candidates = buildCatalogueDuplicateCandidates(products, {
    product_name: 'Hazy Pale Ale',
    producer_id: 10,
    product_category_id: 20,
    edition: '2026'
  })
  const candidate = candidates.find(({ product }) => product.id === 2)

  assert.ok(candidate)
  assert.equal(candidate.exactName, true)
  assert.equal(candidate.editionMatch, false)
  assert.equal(candidate.editionConflict, true)
})

test('edit proposals can exclude the stable product identity being edited', () => {
  const candidates = buildCatalogueDuplicateCandidates(products, {
    product_name: 'Hazy Pale',
    producer_id: 10,
    product_category_id: 20,
    edition: '2026'
  }, { excludeProductId: '1' })

  assert.equal(candidates.some(({ product }) => product.id === 1), false)
  assert.equal(candidates.some(({ product }) => product.id === 4), true)
})

test('candidate arrays and entries are immutable evidence', () => {
  const candidates = buildCatalogueDuplicateCandidates(products, {
    product_name: 'Hazy Pale',
    producer_id: 10,
    product_category_id: 20,
    edition: '2026'
  })

  assert.equal(Object.isFrozen(candidates), true)
  assert.equal(Object.isFrozen(candidates[0]), true)
})
