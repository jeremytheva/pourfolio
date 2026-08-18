import assert from 'node:assert/strict'
import test from 'node:test'
import { BREW_DONE_IT_SCORING_VERSION, calculateBrewDoneItScore } from '../brewDoneItScoring.js'

const target = { productId: 100, producerId: 20, styleId: 3 }
const hierarchy = { 2: 1, 3: 1, 4: 2, 8: 7 }
const score = (guesses, extra = {}) => calculateBrewDoneItScore({ target, guesses, styleParentById: hierarchy, ...extra })

test('exact styles receive exact-style points', () => {
  const result = score([{ type: 'style', id: 3 }])
  assert.equal(result.items[0].outcome, 'exact')
  assert.equal(result.total, 3)
})

test('styles related by the maintained hierarchy receive related-style points', () => {
  const result = score([{ type: 'style', id: 2 }])
  assert.equal(result.items[0].outcome, 'related')
  assert.equal(result.total, 1)
})

test('unrelated style IDs are incorrect without approximate label matching', () => {
  const result = score([{ type: 'style', id: 8 }])
  assert.equal(result.items[0].outcome, 'incorrect')
  assert.equal(result.total, 0)
})

test('exact brewery guesses receive brewery points', () => {
  assert.equal(score([{ type: 'producer', id: 20 }]).total, 5)
})

test('exact product guesses receive product points and complete scoring', () => {
  const result = score([{ type: 'product', id: 100 }])
  assert.equal(result.total, 10)
  assert.equal(result.completed, true)
})

test('duplicate guesses are itemised but consume no attempt and have no cost', () => {
  const result = score([{ type: 'producer', id: 21 }, { type: 'producer', id: 21 }])
  assert.equal(result.attempts.accepted, 1)
  assert.equal(result.items[1].outcome, 'duplicate')
  assert.equal(result.breakdown.incorrectGuessPenalties, -1)
})

test('guesses after six accepted attempts are ignored', () => {
  const result = score([1, 2, 3, 4, 5, 6, 100].map((id) => ({ type: 'product', id })))
  assert.equal(result.attempts.exhausted, true)
  assert.equal(result.items[6].outcome, 'ignored_after_completion')
})

test('maximum and minimum totals are bounded and versioned', () => {
  const maximum = score([
    { type: 'producer', id: 20 }, { type: 'style', id: 3 }, { type: 'product', id: 100 }
  ])
  const minimum = score([1, 2, 3, 4, 5, 6].map((id) => ({ type: 'product', id })), { questionCount: 6 })
  assert.equal(maximum.total, 18)
  assert.equal(minimum.total, 0)
  assert.equal(maximum.version, BREW_DONE_IT_SCORING_VERSION)
})