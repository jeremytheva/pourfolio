import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItDeductionOptions.js'

const { numericOrNull, booleanOrNull } = __testables

test('missing numeric catalogue values remain unknown rather than zero', () => {
  assert.equal(numericOrNull(null), null)
  assert.equal(numericOrNull(undefined), null)
  assert.equal(numericOrNull(''), null)
  assert.equal(numericOrNull('6.5'), 6.5)
})

test('missing collaboration remains unknown rather than false', () => {
  assert.equal(booleanOrNull(null), null)
  assert.equal(booleanOrNull(undefined), null)
  assert.equal(booleanOrNull(''), null)
  assert.equal(booleanOrNull(1), true)
  assert.equal(booleanOrNull('1'), true)
  assert.equal(booleanOrNull(0), false)
  assert.equal(booleanOrNull('0'), false)
  assert.equal(booleanOrNull('unexpected'), null)
})
