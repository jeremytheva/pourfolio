import assert from 'node:assert/strict'
import test from 'node:test'
import { projectCellarRecord } from '../../cellar-data-proxy.js'
import { sanitiseCellarInput } from '../dataPolicy.js'

test('cellar writes preserve the exported series_version_id field', () => {
  assert.deepEqual(
    sanitiseCellarInput({ product_id: 12, sharing_series_id: 6, series_version_id: 74 }),
    { product_id: '12', sharing_series_id: 6, series_version_id: 74 }
  )
})

test('cellar projection exposes series_version_id and never fabricates an edition', () => {
  assert.deepEqual(
    projectCellarRecord({ id: 1, product_id: 12, sharing_series_id: 6, series_version_id: 74 }),
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
      status: 'on_hand',
      quantity_acquired: null,
      date_consumed: null,
      acquisition_type: null,
      historical_import: false,
      product: null
    }
  )
})

test('series and version remain independently nullable', () => {
  assert.deepEqual(
    sanitiseCellarInput({ product_id: 12, sharing_series_id: '', series_version_id: '' }),
    { product_id: '12', sharing_series_id: null, series_version_id: null }
  )
})
