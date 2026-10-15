import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitiseCellarInput } from '../dataPolicy.js'

test('cellar writes reject unrecognised fields rather than silently dropping them', () => {
  assert.throws(
    () => sanitiseCellarInput({ product_id: 12, quantity: 2, unexpected: 'value' }),
    /Unsupported cellar write field/
  )
})

test('cellar quantity must be positive', () => {
  assert.throws(() => sanitiseCellarInput({ product_id: 12, quantity: 0 }), /minimum|positive/)
})
