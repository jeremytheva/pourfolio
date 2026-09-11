import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItOutcomeGame.js'

const { requireOutcomeUnsolved, sameFormalGuess, trueFlag } = __testables

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