import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItDeductionGame.js'

const {
  aggregate,
  canonicalDeductions,
  canonicalIdOrNull,
  committedDeduction,
  deductionLogicalKey,
  sameDeductionRequest,
  unavailableAggregate
} = __testables

test('logical deduction keys are stable across API and provider field shapes', () => {
  assert.equal(
    deductionLogicalKey({ dimension: 'style', referenceId: '12', valueText: 'IPA', numericValue: null }),
    deductionLogicalKey({ dimension: 'style', reference_id: '12', value_text: 'IPA', numeric_value: null })
  )
})

test('idempotent deduction replay requires the same logical clue and answer', () => {
  const stored = {
    dimension: 'abv_at_least',
    answer: 'yes',
    reference_id: null,
    numeric_value: 6,
    value_text: null
  }
  assert.equal(sameDeductionRequest(stored, {
    dimension: 'abv_at_least',
    answer: 'yes',
    referenceId: null,
    numericValue: 6,
    valueText: null
  }), true)
  assert.equal(sameDeductionRequest(stored, {
    dimension: 'abv_at_least',
    answer: 'no',
    referenceId: null,
    numericValue: 6,
    valueText: null
  }), false)
  assert.equal(sameDeductionRequest(stored, {
    dimension: 'abv_at_least',
    answer: 'yes',
    referenceId: null,
    numericValue: 7,
    valueText: null
  }), false)
})

test('style idempotency identity uses canonical reference rather than display label', () => {
  const stored = { dimension: 'style', answer: 'yes', reference_id: 12, value_text: 'India Pale Ale' }
  assert.equal(sameDeductionRequest(stored, {
    dimension: 'style',
    answer: 'yes',
    referenceId: '12',
    valueText: 'IPA',
    numericValue: null
  }), true)
})

test('only committed or legacy-state deduction rows can enter the projected board', () => {
  assert.equal(committedDeduction({ action_state: 'committed' }), true)
  assert.equal(committedDeduction({}), true)
  assert.equal(committedDeduction({ action_state: 'pending' }), false)
  assert.equal(committedDeduction({ action_state: 'discarded' }), false)
})

test('canonical deductions ignore pending and discarded events', () => {
  const rows = canonicalDeductions([
    { id: 1, dimension: 'collaboration', answer: 'yes', action_state: 'committed', created_at: '2026-09-11T10:00:00.000Z' },
    { id: 2, dimension: 'collaboration', answer: 'no', action_state: 'pending', created_at: '2026-09-11T10:01:00.000Z' },
    { id: 3, dimension: 'collaboration', answer: 'unknown', action_state: 'discarded', created_at: '2026-09-11T10:02:00.000Z' }
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 1)
  assert.equal(rows[0].answer, 'yes')
})

test('canonical deductions keep only the newest committed append-only event for one logical clue', () => {
  const rows = canonicalDeductions([
    {
      id: 1,
      dimension: 'collaboration',
      answer: 'yes',
      action_state: 'committed',
      created_at: '2026-09-11T10:00:00.000Z',
      updated_at: '2026-09-11T10:00:00.000Z'
    },
    {
      id: 2,
      dimension: 'collaboration',
      answer: 'no',
      action_state: 'committed',
      created_at: '2026-09-11T10:01:00.000Z',
      updated_at: '2026-09-11T10:02:00.000Z'
    }
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 2)
  assert.equal(rows[0].answer, 'no')
})

test('canonical deductions use row id as a deterministic timestamp tie-breaker', () => {
  const timestamp = '2026-09-11T10:00:00.000Z'
  const rows = canonicalDeductions([
    { id: 8, dimension: 'dark', answer: 'yes', action_state: 'committed', created_at: timestamp, updated_at: timestamp },
    { id: 9, dimension: 'dark', answer: 'unknown', action_state: 'committed', created_at: timestamp, updated_at: timestamp }
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 9)
  assert.equal(rows[0].answer, 'unknown')
})

test('different clue values remain independent deductions', () => {
  const rows = canonicalDeductions([
    { id: 1, dimension: 'abv_at_least', numeric_value: 5, answer: 'yes', action_state: 'committed' },
    { id: 2, dimension: 'abv_at_least', numeric_value: 7, answer: 'no', action_state: 'committed' }
  ])

  assert.equal(rows.length, 2)
})

test('zero blank and missing catalogue relationship ids remain unresolved', () => {
  assert.equal(canonicalIdOrNull(null), null)
  assert.equal(canonicalIdOrNull(''), null)
  assert.equal(canonicalIdOrNull(0), null)
  assert.equal(canonicalIdOrNull('0'), null)
  assert.equal(canonicalIdOrNull(12), '12')
  assert.equal(canonicalIdOrNull('12'), '12')
})

test('history aggregates distinguish a governed zero result from an unresolved relationship', () => {
  const products = new Map([['1', { id: 1, producer_id: 10 }]])
  const known = aggregate([], products, () => true)
  const unknown = unavailableAggregate()

  assert.equal(known.available, true)
  assert.equal(known.ratingCount, 0)
  assert.equal(known.distinctBeerCount, 0)
  assert.equal(unknown.available, false)
  assert.equal(unknown.ratingCount, 0)
  assert.equal(unknown.distinctBeerCount, 0)
})
