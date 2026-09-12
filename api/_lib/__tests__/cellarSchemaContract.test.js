import assert from 'node:assert/strict'
import test from 'node:test'
import { projectCellarRecord } from '../../cellar-data-proxy.js'
import { CELLAR_EDITABLE_FIELDS } from '../../../src/data/contract.js'
import { sanitiseCellarInput } from '../dataPolicy.js'

test('exported series relationships remain canonical fields but non-null launch writes are capability-gated', () => {
  assert.equal(CELLAR_EDITABLE_FIELDS.includes('sharing_series_id'), true)
  assert.equal(CELLAR_EDITABLE_FIELDS.includes('series_version_id'), true)
  assert.throws(
    () => sanitiseCellarInput({ product_id: 12, sharing_series_id: 6, series_version_id: 74 }),
    /verified lookup capability/u
  )
})

test('cellar projection exposes only fields evidenced by the exported table', () => {
  assert.deepEqual(
    projectCellarRecord({
      id: 1,
      product_id: 12,
      sharing_series_id: 6,
      series_version_id: 74,
      status: 'consumed',
      quantity_acquired: 4,
      date_consumed: '2026-09-09T00:00:00.000Z',
      acquisition_type: 'purchase',
      historical_import: true
    }),
    {
      id: 1,
      product_id: 12,
      location_id: null,
      quantity: 0,
      mls: null,
      container: null,
      purchase_price: null,
      retail_price: null,
      date_received: null,
      sharing_series_id: 6,
      series_version_id: 74,
      purchase_location_id: null,
      purchased_by_id: null,
      gift: false,
      gift_from: null,
      bet_id: null,
      notes: '',
      product: null
    }
  )
})

test('server sanitisation drops fields absent from the exported cellar table', () => {
  assert.deepEqual(
    sanitiseCellarInput({
      product_id: 12,
      notes: 'Supported',
      status: 'consumed',
      quantity_acquired: 4,
      date_consumed: '2026-09-09T00:00:00.000Z',
      acquisition_type: 'purchase',
      historical_import: true
    }),
    { product_id: '12', notes: 'Supported' }
  )
})

test('series and version remain independently nullable for explicit clearing', () => {
  assert.deepEqual(
    sanitiseCellarInput({ product_id: 12, sharing_series_id: '', series_version_id: '' }),
    { product_id: '12', sharing_series_id: null, series_version_id: null }
  )
})
