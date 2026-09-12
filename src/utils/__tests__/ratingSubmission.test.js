import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateRatingTotals,
  createSubmissionId,
  validateRatingScores
} from '../ratingSubmission.js'

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

const maximumScores = attributes.map((attribute) => ({
  attributeId: attribute.id,
  score: attribute.id === 7 ? 2 : attribute.id === 8 ? 1 : 7
}))

test('score 1 is a valid required structured score', () => {
  const weights = { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }
  const result = validateRatingScores([{ attributeId: 2, score: 1 }], attributes, weights)
  assert.deepEqual(result.scores.map((score) => score.attribute_score), [1])
})

test('every positively weighted attribute is required', () => {
  assert.throws(
    () => validateRatingScores([{ attributeId: 2, score: 5 }], attributes),
    /positively weighted/
  )
})

test('zero-weight dimensions may be omitted', () => {
  const weights = { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }
  const result = calculateRatingTotals([{ attributeId: 2, score: 7 }], attributes, weights)
  assert.equal(result.total_weighted, 5)
  assert.equal(result.total_unweighted, null)
})

test('Design and Burp may be submitted as optional extras without changing totals', () => {
  const withExtras = calculateRatingTotals(maximumScores, attributes)
  const withoutExtras = calculateRatingTotals(maximumScores.filter(({ attributeId }) => ![1, 8].includes(attributeId)), attributes)
  assert.equal(withExtras.total_weighted, 5)
  assert.equal(withExtras.total_unweighted, 5)
  assert.equal(withoutExtras.total_weighted, 5)
  assert.equal(withExtras.total_weighted, withoutExtras.total_weighted)
})

test('duplicate attribute scores are rejected', () => {
  assert.throws(
    () => validateRatingScores([
      { attributeId: 2, score: 5 },
      { attributeId: 2, score: 6 }
    ], attributes, { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }),
    /only once/
  )
})

test('unknown attributes are rejected', () => {
  assert.throws(
    () => validateRatingScores([{ attributeId: 999, score: 5 }], attributes, { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }),
    /not applicable/
  )
})

test('dimension-specific ranges are enforced', () => {
  assert.throws(
    () => validateRatingScores([{ attributeId: 2, score: 0 }], attributes, { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }),
    /1 to 7/
  )
  assert.throws(
    () => validateRatingScores([{ attributeId: 7, score: 3 }], attributes, { appearance: 0, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 1 }),
    /0 to 2/
  )
  assert.throws(
    () => validateRatingScores([{ attributeId: 8, score: 0.5 }, { attributeId: 2, score: 7 }], attributes, { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }),
    /0 or 1/
  )
})

test('canonical totals are /5 and provider weighting is not authoritative', () => {
  const result = calculateRatingTotals(maximumScores.filter(({ attributeId }) => ![1, 8].includes(attributeId)), attributes)
  assert.equal(result.total_unweighted, 5)
  assert.equal(result.total_weighted, 5)
  assert.equal(result.score_out_of_100, 100)
})

test('personalised weights are normalised by positive total', () => {
  const result = calculateRatingTotals([
    { attributeId: 5, score: 7 },
    { attributeId: 6, score: 1 }
  ], attributes, {
    appearance: 0,
    aroma: 0,
    mouthfeel: 0,
    flavour: 0.75,
    follow: 0.25,
    bonus: 0
  })
  assert.equal(result.total_weighted, Number((5 * (0.75 + 0.25 / 7)).toFixed(2)))
  assert.equal(result.total_unweighted, null)
})

test('duplicate canonical provider dimensions fail closed', () => {
  const duplicated = [...attributes, { id: 9, attribute_name: 'Appearance', is_scored: 1, weighting: 0.1 }]
  assert.throws(
    () => validateRatingScores([{ attributeId: 2, score: 7 }], duplicated, { appearance: 1, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }),
    /duplicate rating attribute/
  )
})

test('submission identifiers are positive safe integers and vary by entropy', () => {
  const first = createSubmissionId(1_700_000_000_000, 0.1)
  const second = createSubmissionId(1_700_000_000_000, 0.2)
  assert.equal(Number.isSafeInteger(first), true)
  assert.equal(first > 0, true)
  assert.notEqual(first, second)
})
