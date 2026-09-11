import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItDeductionGame.js'

const { canonicalDeductions, deductionLogicalKey } = __testables

test('logical deduction keys are stable across API and provider field shapes', () => {
  assert.equal(
    deductionLogicalKey({ dimension: 'style', referenceId: '12', valueText: 'IPA', numericValue: null }),
    deductionLogicalKey({ dimension: 'style', reference_id: '12', value_text: 'IPA', numeric_value: null })
  )
})

test('canonical deductions keep only the newest row for one logical clue', () => {
  const rows = canonicalDeductions([
    {
      id: 1,
      dimension: 'collaboration',
      answer: 'yes',
      created_at: '2026-09-11T10:00:00.000Z',
      updated_at: '2026-09-11T10:00:00.000Z'
    },
    {
      id: 2,
      dimension: 'collaboration',
      answer: 'no',
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
    { id: 8, dimension: 'dark', answer: 'yes', created_at: timestamp, updated_at: timestamp },
    { id: 9, dimension: 'dark', answer: 'unknown', created_at: timestamp, updated_at: timestamp }
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 9)
  assert.equal(rows[0].answer, 'unknown')
})

test('different clue values remain independent deductions', () => {
  const rows = canonicalDeductions([
    { id: 1, dimension: 'abv_at_least', numeric_value: 5, answer: 'yes' },
    { id: 2, dimension: 'abv_at_least', numeric_value: 7, answer: 'no' }
  ])

  assert.equal(rows.length, 2)
})