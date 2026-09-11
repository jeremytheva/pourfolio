import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItStatsV3.js'

const { safePoints, terminalRound, trueFlag, validTimestamp } = __testables

test('terminal stats include completed and forfeited rounds only', () => {
  assert.equal(terminalRound({ status: 'completed' }), true)
  assert.equal(terminalRound({ status: 'forfeited' }), true)
  assert.equal(terminalRound({ status: 'guessing' }), false)
})

test('provider boolean-like values do not treat string zero as true', () => {
  assert.equal(trueFlag(true), true)
  assert.equal(trueFlag(1), true)
  assert.equal(trueFlag('1'), true)
  assert.equal(trueFlag(false), false)
  assert.equal(trueFlag(0), false)
  assert.equal(trueFlag('0'), false)
})

test('stats points fail closed outside the governed round range', () => {
  assert.equal(safePoints(7), 7)
  assert.equal(safePoints('10'), 10)
  assert.equal(safePoints(-1), 0)
  assert.equal(safePoints(11), 0)
  assert.equal(safePoints('invalid'), 0)
})

test('invalid completion timestamps remain absent from ordering', () => {
  assert.equal(validTimestamp(null), null)
  assert.equal(validTimestamp('not-a-date'), null)
  assert.equal(Number.isFinite(validTimestamp('2026-09-11T10:00:00.000Z')), true)
})