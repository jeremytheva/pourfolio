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

test('cellar received dates require a real calendar day and preserve valid leap days', () => {
  for (const date_received of ['2024-02-29', '2000-02-29', '2026-01-31', '2026-12-31']) {
    assert.equal(sanitiseCellarInput({ date_received }, { partial: true }).date_received, date_received)
  }
  for (const date_received of [
    '2026-02-30', '2023-02-29', '1900-02-29', '2026-04-31', '2026-13-01',
    '2026-01-00', '0000-01-01', '19/10/2026', '2026-10-19T00:00:00Z',
    0, 1, true, false, [], ['2026-10-19'], {}
  ]) {
    assert.throws(() => sanitiseCellarInput({ date_received }, { partial: true }), /Date received is invalid/u)
  }
  for (const date_received of [null, '']) {
    assert.equal(sanitiseCellarInput({ date_received }, { partial: true }).date_received, null)
  }
  assert.deepEqual(sanitiseCellarInput({ notes: 'Unchanged date' }, { partial: true }), { notes: 'Unchanged date' })
})

test('cellar numbers preserve decimal form values, zero and optional clearing without coercing objects or booleans', () => {
  assert.deepEqual(sanitiseCellarInput({
    quantity: '0', mls: '375', purchase_price: '12.50', retail_price: ' 0 '
  }, { partial: true }), { quantity: 0, mls: 375, purchase_price: 12.5, retail_price: 0 })
  for (const field of ['quantity', 'mls', 'purchase_price', 'retail_price']) {
    for (const value of [true, false, [], ['2'], {}, '0x10', 'Infinity', 'NaN']) {
      assert.throws(() => sanitiseCellarInput({ [field]: value }, { partial: true }), /numeric field/u)
    }
    for (const value of [null, '', '   ']) {
      assert.equal(sanitiseCellarInput({ [field]: value }, { partial: true })[field], null)
    }
  }
  assert.equal(sanitiseCellarInput({ quantity: '1e2' }, { partial: true }).quantity, 100)
  assert.throws(() => sanitiseCellarInput({ quantity: '1.5' }, { partial: true }), /numeric field/u)
  assert.throws(() => sanitiseCellarInput({ mls: 100001 }, { partial: true }), /maximum/u)
})

test('cellar gift flags accept only explicit Boolean or zero/one wire values', () => {
  for (const gift of [false, 0, '0', null, '']) {
    assert.equal(sanitiseCellarInput({ gift }, { partial: true }).gift, 0)
  }
  for (const gift of [true, 1, '1']) {
    assert.equal(sanitiseCellarInput({ gift }, { partial: true }).gift, 1)
  }
  for (const gift of ['false', 'true', 'yes', 2, -1, [], {}]) {
    assert.throws(() => sanitiseCellarInput({ gift }, { partial: true }), /Gift flag is invalid/u)
  }
})

test('cellar text and product identifiers reject non-primitive payloads', () => {
  for (const field of ['container', 'gift_from', 'notes']) {
    for (const value of [{}, [], true, 12]) {
      assert.throws(() => sanitiseCellarInput({ [field]: value }, { partial: true }), /text field/u)
    }
    assert.equal(sanitiseCellarInput({ [field]: '  Supported  ' }, { partial: true })[field], 'Supported')
    assert.equal(sanitiseCellarInput({ [field]: null }, { partial: true })[field], null)
  }
  assert.throws(() => sanitiseCellarInput({ product_id: [12] }), /Product identifier is invalid/u)
  for (const input of [[], null, 'invalid', 12]) {
    assert.throws(() => sanitiseCellarInput(input, { partial: true }), /Request data is invalid/u)
  }
})
