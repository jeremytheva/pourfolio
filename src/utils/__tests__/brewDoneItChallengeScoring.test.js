import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BREW_DONE_IT_RULES,
  BREW_DONE_IT_SCORING_VERSION,
  calculateBrewDoneItRoundScore
} from '../brewDoneItChallengeScoring.js'

test('a first-attempt correct beer guess awards the full ten points', () => {
  const result = calculateBrewDoneItRoundScore({ correct: true })
  assert.equal(result.total, 10)
  assert.equal(result.version, BREW_DONE_IT_SCORING_VERSION)
  assert.deepEqual(result.breakdown, {
    startingPoints: 10,
    questionPenalty: 0,
    incorrectGuessPenalty: 0,
    rawTotal: 10
  })
})

test('questions and incorrect beer guesses each cost one point', () => {
  const result = calculateBrewDoneItRoundScore({
    correct: true,
    questionCount: 3,
    incorrectGuessCount: 2
  })
  assert.equal(result.total, 5)
  assert.equal(result.breakdown.questionPenalty, -3)
  assert.equal(result.breakdown.incorrectGuessPenalty, -2)
})

test('a round without a correct beer guess awards zero points', () => {
  const result = calculateBrewDoneItRoundScore({
    correct: false,
    questionCount: 4,
    incorrectGuessCount: 5
  })
  assert.equal(result.total, 0)
  assert.equal(result.breakdown.startingPoints, 0)
})

test('round score is clamped to zero after enough penalties', () => {
  const result = calculateBrewDoneItRoundScore({
    correct: true,
    questionCount: BREW_DONE_IT_RULES.maxQuestions,
    incorrectGuessCount: 5
  })
  assert.equal(result.total, 0)
})

test('invalid counters fail closed', () => {
  assert.throws(() => calculateBrewDoneItRoundScore({ correct: true, questionCount: -1 }), RangeError)
  assert.throws(() => calculateBrewDoneItRoundScore({ correct: true, questionCount: 11 }), RangeError)
  assert.throws(() => calculateBrewDoneItRoundScore({ correct: true, incorrectGuessCount: 21 }), RangeError)
  assert.throws(() => calculateBrewDoneItRoundScore({ correct: true, questionCount: 10, incorrectGuessCount: 11 }), RangeError)
})
