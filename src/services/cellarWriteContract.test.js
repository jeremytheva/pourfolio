import assert from 'node:assert/strict'
import test from 'node:test'

import { CELLAR_EDITABLE_FIELDS, CELLAR_GATED_RELATIONSHIP_FIELDS } from '../data/contract.js'
import { projectCellarWrite } from './cellarWriteContract.js'

const EXPORTED_CELLAR_WRITABLE_FIELDS = [
  'product_id',
  'location_id',
  'quantity',
  'mls',
  'container',
  'purchase_price',
  'retail_price',
  'date_received',
  'sharing_series_id',
  'series_version_id',
  'purchase_location_id',
  'purchased_by_id',
  'gift',
  'gift_from',
  'bet_id',
  'notes'
]

const GATED_RELATIONSHIP_FIELDS = [
  'location_id',
  'sharing_series_id',
  'series_version_id',
  'purchase_location_id',
  'purchased_by_id',
  'bet_id'
]

test('canonical cellar writable fields match the supplied backend table', () => {
  assert.deepEqual(CELLAR_EDITABLE_FIELDS, EXPORTED_CELLAR_WRITABLE_FIELDS)
  assert.deepEqual(CELLAR_GATED_RELATIONSHIP_FIELDS, GATED_RELATIONSHIP_FIELDS)
})

test('projects only launch-supported cellar writable fields without mutating input', () => {
  const input = {
    product_id: 42,
    quantity: '2',
    notes: 'Keep cold',
    series_version_id: null,
    user_id: 'forged-user',
    secret_key: 'forged-secret',
    series_edition_id: 99,
    status: 'consumed',
    quantity_acquired: 4,
    date_consumed: '2026-09-09T00:00:00.000Z',
    acquisition_type: 'purchase',
    historical_import: true,
    arbitrary: 'ignored'
  }
  const snapshot = structuredClone(input)

  assert.deepEqual(projectCellarWrite(input, { requireProduct: true }), {
    product_id: 42,
    quantity: '2',
    notes: 'Keep cold'
  })
  assert.deepEqual(input, snapshot)
})

test('rejects non-null relationship fields that have no verified launch lookup capability', () => {
  for (const field of CELLAR_GATED_RELATIONSHIP_FIELDS) {
    assert.throws(
      () => projectCellarWrite({ product_id: 42, [field]: 12 }, { requireProduct: true }),
      new RegExp(`Cellar relationship ${field} is unavailable`, 'u')
    )
  }
})

test('null or blank gated relationship values are omitted rather than transported', () => {
  const input = Object.fromEntries(CELLAR_GATED_RELATIONSHIP_FIELDS.map((field, index) => [field, index % 2 ? '' : null]))
  assert.deepEqual(projectCellarWrite({ product_id: 42, notes: 'Keep cold', ...input }, { requireProduct: true }), {
    product_id: 42,
    notes: 'Keep cold'
  })
})

test('rejects an update containing only fields absent from the exported cellar table', () => {
  assert.throws(
    () => projectCellarWrite({
      status: 'consumed',
      quantity_acquired: 4,
      date_consumed: '2026-09-09T00:00:00.000Z',
      acquisition_type: 'purchase',
      historical_import: true
    }, { requireAtLeastOne: true }),
    /at least one supported field/i
  )
})

test('requires product identity for create projection', () => {
  assert.throws(
    () => projectCellarWrite({ quantity: 1 }, { requireProduct: true }),
    /product is required/i
  )
})

test('rejects update bodies containing no supported cellar fields', () => {
  assert.throws(
    () => projectCellarWrite({ user_id: 'forged', series_edition_id: 12 }, { requireAtLeastOne: true }),
    /at least one supported field/i
  )
})
