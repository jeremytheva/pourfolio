import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItOutcomeGame.js'

const { canonicalIdOrNull, requireOutcomeUnsolved, requireScorableOutcome, sameFormalGuess, trueFlag } = __testables

test('provider string zero is not treated as a solved Brew outcome', () => {
  assert.equal(trueFlag('0'), false)
  assert.equal(trueFlag('1'), true)
  assert.doesNotThrow(() => requireOutcomeUnsolved({ beer_correct: '0', brewery_correct: '0', style_correct: '0' }, {
    guessType: 'brewery',
    referenceId: '10'
  }))
})

test('solved outcome components reject further formal submissions of that component', () => {
  assert.throws(
    () => requireOutcomeUnsolved({ beer_correct: '1' }, { guessType: 'style', referenceId: '20' }),
    /exact beer is already solved/i
  )
  assert.throws(
    () => requireOutcomeUnsolved({ beer_correct: '0', brewery_correct: '1' }, { guessType: 'brewery', referenceId: '10' }),
    /brewery is already solved/i
  )
})

test('formal guess identity includes both outcome type and referenced catalogue record', () => {
  const stored = {
    guess_type: 'brewery',
    guessed_producer_id: '12',
    guessed_product_id: null,
    guessed_category_id: null
  }
  assert.equal(sameFormalGuess(stored, { guessType: 'brewery', referenceId: '12' }), true)
  assert.equal(sameFormalGuess(stored, { guessType: 'brewery', referenceId: '13' }), false)
  assert.equal(sameFormalGuess(stored, { guessType: 'beer', referenceId: '12' }), false)
})

test('canonical relationship identifiers reject zero blank and missing values', () => {
  assert.equal(canonicalIdOrNull(null), null)
  assert.equal(canonicalIdOrNull(''), null)
  assert.equal(canonicalIdOrNull(0), null)
  assert.equal(canonicalIdOrNull('0'), null)
  assert.equal(canonicalIdOrNull(12), '12')
})

test('formal brewery outcome is unavailable without a governed producer relationship', () => {
  assert.throws(
    () => requireScorableOutcome({ guessType: 'brewery', referenceId: '12' }, { id: 8, producer_id: 0 }),
    (error) => error?.code === 'OUTCOME_UNAVAILABLE' && /no governed brewery relationship/i.test(error.message)
  )
  assert.throws(
    () => requireScorableOutcome({ guessType: 'brewery', referenceId: '12' }, { id: 8, producer_id: '' }),
    /formal brewery guess cannot be scored/i
  )
})

test('formal style fallback is unavailable without a governed category relationship', () => {
  assert.throws(
    () => requireScorableOutcome({ guessType: 'style', referenceId: '20' }, { id: 8, product_category_id: null }),
    (error) => error?.code === 'OUTCOME_UNAVAILABLE' && /no governed style relationship/i.test(error.message)
  )
})

test('exact beer remains scorable even when optional brewery or style relationships are unresolved', () => {
  assert.doesNotThrow(() => requireScorableOutcome(
    { guessType: 'beer', referenceId: '8' },
    { id: 8, producer_id: 0, product_category_id: null }
  ))
})
