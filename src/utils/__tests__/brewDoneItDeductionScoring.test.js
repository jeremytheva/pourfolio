import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BREW_DONE_IT_DEDUCTION_RULES,
  BREW_DONE_IT_DEDUCTION_SCORING_VERSION,
  calculateBrewDoneItDeductionScore
} from '../brewDoneItDeductionScoring.js'

test('brewery plus exact beer awards the full ten points', () => {
  const result = calculateBrewDoneItDeductionScore({ breweryCorrect: true, beerCorrect: true })
  assert.equal(result.total, 10)
  assert.equal(result.version, BREW_DONE_IT_DEDUCTION_SCORING_VERSION)
  assert.deepEqual(result.breakdown, {
    breweryPoints: 4,
    exactBeerPoints: 6,
    styleFallbackPoints: 0,
    incorrectFormalGuessPenalty: 0,
    basePoints: 10
  })
})

test('an exact beer confirms the brewery even without a separate brewery submission', () => {
  const result = calculateBrewDoneItDeductionScore({ beerCorrect: true })
  assert.equal(result.total, 10)
  assert.equal(result.breweryCorrect, true)
  assert.equal(result.beerCorrect, true)
})

test('brewery plus style fallback awards seven points', () => {
  const result = calculateBrewDoneItDeductionScore({ breweryCorrect: true, styleCorrect: true })
  assert.equal(result.total, 7)
  assert.equal(result.breakdown.breweryPoints, 4)
  assert.equal(result.breakdown.styleFallbackPoints, 3)
})

test('style alone remains a partial result', () => {
  const result = calculateBrewDoneItDeductionScore({ styleCorrect: true })
  assert.equal(result.total, 3)
  assert.equal(result.breweryCorrect, false)
})

test('style fallback never stacks with an exact beer', () => {
  const result = calculateBrewDoneItDeductionScore({
    breweryCorrect: true,
    styleCorrect: true,
    beerCorrect: true
  })
  assert.equal(result.total, 10)
  assert.equal(result.styleCorrect, false)
  assert.equal(result.breakdown.styleFallbackPoints, 0)
})

test('incorrect formal submissions cost one point each and clamp at zero', () => {
  assert.equal(calculateBrewDoneItDeductionScore({ breweryCorrect: true, incorrectFormalGuessCount: 2 }).total, 2)
  assert.equal(calculateBrewDoneItDeductionScore({ styleCorrect: true, incorrectFormalGuessCount: 4 }).total, 0)
})

test('ordinary questions and deduction notes are not scoring inputs', () => {
  const result = calculateBrewDoneItDeductionScore({ breweryCorrect: true })
  assert.equal(result.total, BREW_DONE_IT_DEDUCTION_RULES.breweryPoints)
  assert.equal(Object.hasOwn(result.breakdown, 'questionPenalty'), false)
})

test('invalid formal-submission counters fail closed', () => {
  assert.throws(() => calculateBrewDoneItDeductionScore({ incorrectFormalGuessCount: -1 }), RangeError)
  assert.throws(() => calculateBrewDoneItDeductionScore({ incorrectFormalGuessCount: 21 }), RangeError)
})
