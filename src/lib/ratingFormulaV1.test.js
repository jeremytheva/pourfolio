import { describe, expect, it } from 'vitest'
import {
  POURFOLIO_RATING_FORMULA_VERSION,
  RATING_DIMENSIONS,
  calculateRatingTotals,
  formatRatingTotal,
  normaliseRatingDimension
} from './ratingFormulaV1.js'

describe('Pourfolio Rating Formula v1', () => {
  it('keeps the formula version and weights stable', () => {
    expect(POURFOLIO_RATING_FORMULA_VERSION).toBe('v1')
    expect(RATING_DIMENSIONS.map(({ key, weight }) => [key, weight])).toEqual([
      ['design', 0.10],
      ['appearance', 0.10],
      ['aroma', 0.15],
      ['mouthfeel', 0.15],
      ['flavour', 0.30],
      ['follow', 0.10],
      ['bonus', 0.07],
      ['burp', 0.03]
    ])
    expect(RATING_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0)).toBeCloseTo(1)
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

    expect(totals.weighted).toBeCloseTo(5)
    expect(totals.unweighted).toBeCloseTo(5)
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
    expect(totals.unweighted).toBeCloseTo(expected)
  })

  it('rejects missing, out-of-range and non-binary burp values', () => {
    expect(calculateRatingTotals({})).toBeNull()
    expect(normaliseRatingDimension('design', 8)).toBeNull()
    expect(normaliseRatingDimension('bonus', 3)).toBeNull()
    expect(normaliseRatingDimension('burp', 0.5)).toBeNull()
  })

  it('formats totals to two decimal places', () => {
    expect(formatRatingTotal(4.276)).toBe('4.28')
    expect(formatRatingTotal(null)).toBe('—')
  })
})
