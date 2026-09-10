import assert from 'node:assert/strict'
import test from 'node:test'

import { CELLAR_EDITABLE_FIELDS } from '../data/contract.js'
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

test('canonical cellar writable fields match the supplied backend table', () => {
  assert.deepEqual(CELLAR_EDITABLE_FIELDS, EXPORTED_CELLAR_WRITABLE_FIELDS)
})

test('projects only canonical cellar writable fields without mutating input', () => {
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
    series_version_id: null,
    notes: 'Keep cold'
  })
  assert.deepEqual(input, snapshot)
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
