import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateFinalRating } from '../ratingCalculator.js'

const sampleAttributes = {
  appearance: { score: 7, weight: 1.5 },
  aroma: { score: 6, weight: 3 },
  mouthfeel: { score: 5, weight: 3 },
  flavour: { score: 6, weight: 4.5 },
  follow: { score: 5, weight: 2.5 },
  design: { score: 4, weight: 0 }
}

describe('calculateFinalRating', () => {
  it('combines weighted base score with selected bonus attributes', () => {
    const result = calculateFinalRating(sampleAttributes, [{ id: 'memorable', name: 'Memorable', weight: 0.2 }])

    assert.ok(Math.abs(result.baseRating - 3.54) < 0.01)
    assert.ok(Math.abs(result.bonusPoints - 0.2) < 0.01)
    assert.ok(Math.abs(result.finalRating - 3.74) < 0.01)
  })

  it('clamps manual bonus overrides to the allowed range', () => {
    const result = calculateFinalRating(sampleAttributes, [], 0.75)

    assert.equal(result.bonusPoints, 0.5)
    assert.ok(Math.abs(result.finalRating - 4.04) < 0.01)
  })

  it('omits bonus contributions when hideBonus is true', () => {
    const result = calculateFinalRating(sampleAttributes, [{ id: 'greatValue', name: 'Great Value', weight: 0.3 }], null, true)

    assert.equal(result.bonusPoints, 0)
    assert.equal(result.finalRating, result.baseRating)
  })
})
