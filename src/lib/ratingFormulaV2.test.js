import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_RATING_WEIGHTS,
  POURFOLIO_RATING_FORMULA_VERSION,
  RATING_DIMENSIONS,
  adjustableDollarScore,
  calculatePPP,
  calculateRatingTotals,
  calculateScaledScore,
  formatRatingTotal,
  normalisePriceTo375,
  normaliseRatingDimension,
  scoreOutOf100
} from './ratingFormulaV1.js'

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`)
}

const complete = {
  appearance: 7,
  aroma: 7,
  mouthfeel: 7,
  flavour: 7,
  follow: 7,
  bonus: 2,
  design: 1,
  burp: 0
}

describe('Pourfolio Rating Formula v2', () => {
  it('uses the approved default weights and excludes Design and Burp', () => {
    assert.equal(POURFOLIO_RATING_FORMULA_VERSION, 'v2')
    assert.deepEqual(DEFAULT_RATING_WEIGHTS, {
      appearance: 0.10,
      aroma: 0.10,
      mouthfeel: 0.20,
      flavour: 0.25,
      follow: 0.25,
      bonus: 0.10
    })
    assert.equal(RATING_DIMENSIONS.find((item) => item.key === 'design').scored, false)
    assert.equal(RATING_DIMENSIONS.find((item) => item.key === 'burp').scored, false)
  })

  it('returns 5 at the maximum and ignores fun extra values', () => {
    const first = calculateRatingTotals(complete)
    const second = calculateRatingTotals({ ...complete, design: 7, burp: 1 })
    closeTo(first.weighted, 5)
    closeTo(first.standard, 5)
    closeTo(second.weighted, first.weighted)
  })

  it('normalises personalised positive weights and permits zero-weight omissions', () => {
    const totals = calculateRatingTotals({ flavour: 7, follow: 1 }, {
      appearance: 0,
      aroma: 0,
      mouthfeel: 0,
      flavour: 0.75,
      follow: 0.25,
      bonus: 0
    })
    closeTo(totals.weighted, 5 * ((0.75 * 1) + (0.25 * (1 / 7))))
    assert.equal(totals.standard, null)
  })

  it('treats Bonus as 0-2 and normal attributes as 1-7', () => {
    assert.equal(normaliseRatingDimension('bonus', 0), 0)
    assert.equal(normaliseRatingDimension('bonus', 2), 1)
    assert.equal(normaliseRatingDimension('bonus', 3), null)
    assert.equal(normaliseRatingDimension('appearance', 0), null)
    assert.equal(normaliseRatingDimension('appearance', 7), 1)
    assert.equal(normaliseRatingDimension('burp', 1), 1)
  })

  it('converts the final score to 100 without changing its rank meaning', () => {
    assert.equal(scoreOutOf100(4.76), 95.2)
  })

  it('normalises price to 375 mL and reproduces spreadsheet PPP bands', () => {
    closeTo(normalisePriceTo375(8, 440), 8 * 375 / 440)
    assert.equal(adjustableDollarScore(5.99), 10)
    assert.equal(adjustableDollarScore(6), 10.33)
    assert.equal(adjustableDollarScore(8), 10.66)
    assert.equal(adjustableDollarScore(10), 11)
    assert.equal(adjustableDollarScore(15), 12)
    assert.equal(adjustableDollarScore(20), 13)
    assert.equal(adjustableDollarScore(25), 14)
    assert.equal(adjustableDollarScore(37.5), 18)
    assert.equal(calculatePPP(5, 20, 375), 156.25)
  })

  it('uses tie-aware percentile rank for scaled score', () => {
    const population = [3.2, 3.8, 4.1, 4.1, 4.7, 5, 5.4, 5.6, 5.6, 6.1]
      .map((value) => Math.min(5, value))
    assert.equal(calculateScaledScore(5, population), 77.78)
    assert.equal(calculateScaledScore(4, [4]), 50)
    assert.equal(calculateScaledScore(4, [4, 4, 4]), 50)
  })

  it('formats totals to two decimal places', () => {
    assert.equal(formatRatingTotal(4.276), '4.28')
    assert.equal(formatRatingTotal(null), '—')
  })
})
