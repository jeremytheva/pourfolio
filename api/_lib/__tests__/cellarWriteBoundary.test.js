import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitiseCellarInput } from '../dataPolicy.js'

test('cellar writes preserve zero quantity while stripping unsupported identity and state fields', () => {
  assert.deepEqual(sanitiseCellarInput({
    product_id: 12, quantity: 0, id: 99, user_id: 'forged-owner',
    secret_key: 'not-a-credential', status: 'consumed', unexpected: 'value'
  }), { product_id: '12', quantity: 0 })
})

test('rejected cellar updates do not partially normalise the caller payload', () => {
  const input = Object.freeze({ quantity: '2', gift: false, date_received: '2026-02-30' })
  assert.throws(() => sanitiseCellarInput(input, { partial: true }), /Date received is invalid/u)
  assert.deepEqual(input, { quantity: '2', gift: false, date_received: '2026-02-30' })
})
