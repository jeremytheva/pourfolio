import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  POURFOLIO_RATING_FORMULA_VERSION,
  RATING_DIMENSIONS,
  calculateRatingTotals,
  formatRatingTotal,
  normaliseRatingDimension
} from './ratingFormulaV1.js'

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`)
}

describe('Pourfolio Rating Formula v1', () => {
  it('keeps the formula version and weights stable', () => {
    assert.equal(POURFOLIO_RATING_FORMULA_VERSION, 'v1')
    assert.deepEqual(RATING_DIMENSIONS.map(({ key, weight }) => [key, weight]), [
      ['design', 0.10],
      ['appearance', 0.10],
      ['aroma', 0.15],
      ['mouthfeel', 0.15],
      ['flavour', 0.30],
      ['follow', 0.10],
      ['bonus', 0.07],
      ['burp', 0.03]
    ])
    closeTo(RATING_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0), 1)
  })

  it('returns 5 for both totals at the maximum score', () => {
    const totals = calculateRatingTotals({
      design: 7,
      appearance: 7,
      aroma: 7,
      mouthfeel: 7,
      flavour: 7,
      follow: 7,
      bonus: 2,
      burp: 1
    })

    closeTo(totals.weighted, 5)
    closeTo(totals.unweighted, 5)
  })

  it('gives each normalised dimension equal influence in the unweighted total', () => {
    const totals = calculateRatingTotals({
      design: 7,
      appearance: 1,
      aroma: 1,
      mouthfeel: 1,
      flavour: 1,
      follow: 1,
      bonus: 0,
      burp: 0
    })

    const expected = 5 * ((1 + (5 / 7)) / 8)
    closeTo(totals.unweighted, expected)
  })

  it('rejects missing, out-of-range and non-binary burp values', () => {
    assert.equal(calculateRatingTotals({}), null)
    assert.equal(normaliseRatingDimension('design', 8), null)
    assert.equal(normaliseRatingDimension('bonus', 3), null)
    assert.equal(normaliseRatingDimension('burp', 0.5), null)
  })

  it('formats totals to two decimal places', () => {
    assert.equal(formatRatingTotal(4.276), '4.28')
    assert.equal(formatRatingTotal(null), '—')
  })
})
