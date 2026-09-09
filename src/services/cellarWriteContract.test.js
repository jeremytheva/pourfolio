import assert from 'node:assert/strict'
import test from 'node:test'

import { projectCellarWrite } from './cellarWriteContract.js'

test('projects only canonical cellar writable fields without mutating input', () => {
  const input = {
    product_id: 42,
    quantity: '2',
    notes: 'Keep cold',
    series_version_id: null,
    user_id: 'forged-user',
    series_edition_id: 99,
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

test('supports current lifecycle fields at the browser boundary', () => {
  assert.deepEqual(projectCellarWrite({
    status: 'consumed',
    quantity_acquired: 4,
    date_consumed: '2026-09-09T00:00:00.000Z',
    acquisition_type: 'purchase',
    historical_import: true
  }, { requireAtLeastOne: true }), {
    status: 'consumed',
    quantity_acquired: 4,
    date_consumed: '2026-09-09T00:00:00.000Z',
    acquisition_type: 'purchase',
    historical_import: true
  })
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
