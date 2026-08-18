import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateRatingTotals,
  createSubmissionId,
  validateRatingScores
} from '../ratingSubmission.js'

const attributes = [
  { id: 2, attribute_name: 'Appearance', is_scored: 1, weighting: 0.1 },
  { id: 3, attribute_name: 'Aroma', is_scored: 1, weighting: 0.2 },
  { id: 4, attribute_name: 'Design', is_scored: 0, weighting: 0 }
]

test('score 1 is a valid completed score', () => {
  const result = validateRatingScores([
    { attributeId: 2, score: 1 },
    { attributeId: 3, score: 1 }
  ], attributes)
  assert.deepEqual(result.map((score) => score.attribute_score), [1, 1])
})

test('every applicable attribute is required', () => {
  assert.throws(
    () => validateRatingScores([{ attributeId: 2, score: 5 }], attributes),
    /Every applicable/
  )
})

test('unscored attributes cannot be submitted as scores', () => {
  assert.throws(
    () => validateRatingScores([
      { attributeId: 2, score: 5 },
      { attributeId: 4, score: 5 }
    ], attributes),
    /not applicable/
  )
})

test('duplicate attribute scores are rejected', () => {
  assert.throws(
    () => validateRatingScores([
      { attributeId: 2, score: 5 },
      { attributeId: 2, score: 6 }
    ], attributes),
    /only once/
  )
})

test('scores outside the inclusive 1 to 7 range are rejected', () => {
  assert.throws(
    () => validateRatingScores([
      { attributeId: 2, score: 0 },
      { attributeId: 3, score: 8 }
    ], attributes),
    /integer from 1 to 7/
  )
})

test('weighted and unweighted totals are server reproducible', () => {
  const result = calculateRatingTotals([
    { attributeId: 2, score: 4 },
    { attributeId: 3, score: 7 }
  ], attributes)
  assert.equal(result.total_unweighted, 5.5)
  assert.equal(result.total_weighted, 6)
})

test('zero-weight forms fall back to the unweighted total', () => {
  const zeroWeights = attributes.map((attribute) => ({ ...attribute, weighting: 0 }))
  const result = calculateRatingTotals([
    { attributeId: 2, score: 2 },
    { attributeId: 3, score: 6 }
  ], zeroWeights)
  assert.equal(result.total_unweighted, 4)
  assert.equal(result.total_weighted, 4)
})

test('submission identifiers are positive safe integers and vary by entropy', () => {
  const first = createSubmissionId(1_700_000_000_000, 0.1)
  const second = createSubmissionId(1_700_000_000_000, 0.2)
  assert.equal(Number.isSafeInteger(first), true)
  assert.equal(first > 0, true)
  assert.notEqual(first, second)
})