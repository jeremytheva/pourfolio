import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItViewV3.js'

const { stalePendingDeduction } = __testables

test('same-version pending deduction remains recoverable while round is guessing', () => {
  assert.equal(stalePendingDeduction(
    { action_state: 'pending', observed_round_version: 4 },
    { status: 'guessing', version: 4 }
  ), false)
})

test('pending deduction becomes stale when the round version advances', () => {
  assert.equal(stalePendingDeduction(
    { action_state: 'pending', observed_round_version: 4 },
    { status: 'guessing', version: 5 }
  ), true)
})

test('pending deduction becomes stale when the round is terminal', () => {
  assert.equal(stalePendingDeduction(
    { action_state: 'pending', observed_round_version: 4 },
    { status: 'completed', version: 4 }
  ), true)
})

test('committed deduction is never reclassified by resume cleanup', () => {
  assert.equal(stalePendingDeduction(
    { action_state: 'committed', observed_round_version: 4 },
    { status: 'completed', version: 7 }
  ), false)
})
