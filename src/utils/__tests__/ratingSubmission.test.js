import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRatingTotals, createSubmissionId, validateRatingScores } from '../ratingSubmission.js'

const attributes = [
  { id: 1, attribute_name: 'Design', is_scored: 0, weighting: 0 },
  { id: 2, attribute_name: 'Appearence', is_scored: 1, weighting: 0.1 },
  { id: 3, attribute_name: 'Aroma', is_scored: 1, weighting: 0.1 },
  { id: 4, attribute_name: 'Mouthfeel', is_scored: 1, weighting: 0.2 },
  { id: 5, attribute_name: 'Flavour', is_scored: 1, weighting: 0.25 },
  { id: 6, attribute_name: 'Follow', is_scored: 1, weighting: 0.25 },
  { id: 7, attribute_name: 'Bonus', is_scored: 1, weighting: 0.1 },
  { id: 8, attribute_name: 'Burp', is_scored: 0, weighting: 0 }
]

const fullScores = [
  { attributeId: 1, score: 7 },
  { attributeId: 2, score: 7 },
  { attributeId: 3, score: 7 },
  { attributeId: 4, score: 7 },
  { attributeId: 5, score: 7 },
  { attributeId: 6, score: 7 },
  { attributeId: 7, score: 2 },
  { attributeId: 8, score: 1 }
]

test('default scoring produces a final score out of five', () => {
  const result = calculateRatingTotals(fullScores, attributes)
  assert.equal(result.total_weighted, 5)
  assert.equal(result.total_unweighted, 5)
  assert.equal(result.score_out_of_100, 100)
})

test('Design and Burp are accepted fun extras but never affect totals', () => {
  const high = calculateRatingTotals(fullScores, attributes)
  const low = calculateRatingTotals(fullScores.map((score) => score.attributeId === 1 ? { ...score, score: 1 } : score.attributeId === 8 ? { ...score, score: 0 } : score), attributes)
  assert.equal(high.total_weighted, low.total_weighted)
})

test('zero-weight scoring attributes may be omitted', () => {
  const weights = { appearance: 0, aroma: 0, mouthfeel: 0, flavour: 0.75, follow: 0.25, bonus: 0 }
  const result = calculateRatingTotals([
    { attributeId: 5, score: 7 },
    { attributeId: 6, score: 1 }
  ], attributes, weights)
  assert.equal(result.total_weighted, 3.93)
  assert.equal(result.total_unweighted, null)
})

test('positively weighted attributes remain required', () => {
  assert.throws(
    () => validateRatingScores([{ attributeId: 5, score: 7 }], attributes, { appearance: 0, aroma: 0, mouthfeel: 0, flavour: 0.5, follow: 0.5, bonus: 0 }),
    /positively weighted/
  )
})

test('Bonus uses the 0 to 2 range', () => {
  const scores = fullScores.map((score) => score.attributeId === 7 ? { ...score, score: 0 } : score)
  assert.doesNotThrow(() => validateRatingScores(scores, attributes))
  assert.throws(() => validateRatingScores(fullScores.map((score) => score.attributeId === 7 ? { ...score, score: 3 } : score), attributes), /0 to 2/)
})

test('duplicate and unknown attribute scores fail closed', () => {
  assert.throws(() => validateRatingScores([...fullScores, { attributeId: 2, score: 5 }], attributes), /only once/)
  assert.throws(() => validateRatingScores([...fullScores, { attributeId: 999, score: 5 }], attributes), /not applicable/)
})

test('submission identifiers are positive safe integers and vary by entropy', () => {
  const first = createSubmissionId(1_700_000_000_000, 0.1)
  const second = createSubmissionId(1_700_000_000_000, 0.2)
  assert.equal(Number.isSafeInteger(first), true)
  assert.equal(first > 0, true)
  assert.notEqual(first, second)
})
