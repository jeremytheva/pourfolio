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
  canonicalRatingKey,
  formatRatingTotal,
  normalisePriceTo375,
  normaliseRatingDimension,
  sanitiseRatingWeights,
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

  it('recognises deployed aliases without changing canonical scoring keys', () => {
    assert.equal(canonicalRatingKey('Appearence'), 'appearance')
    assert.equal(canonicalRatingKey('Package Design'), 'design')
    assert.equal(canonicalRatingKey('Follow (Finish)'), 'follow')
    assert.equal(canonicalRatingKey('Burp'), 'burp')
    assert.equal(canonicalRatingKey('Unknown'), null)
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

  it('requires at least one positive valid personalised weight', () => {
    assert.throws(() => sanitiseRatingWeights({ appearance: 0, aroma: 0, mouthfeel: 0, flavour: 0, follow: 0, bonus: 0 }))
    assert.throws(() => sanitiseRatingWeights({ appearance: 1.1 }))
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
    assert.equal(scoreOutOf100(5.1), null)
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
    // Tasting Paddle row 250: a $17 / 375 mL beer with a score of 5 uses dollar score 12.
    assert.equal(calculatePPP(5, 17, 375), 156.25)
    assert.equal(calculatePPP(4, null, 375), null)
  })

  it('uses tie-aware percentile rank for scaled score', () => {
    const population = [3.2, 3.8, 4.1, 4.1, 4.7, 5, 5.4, 5.6, 5.6, 6.1]
      .map((value) => Math.min(5, value))
    assert.equal(calculateScaledScore(5, population), 77.78)
    assert.equal(calculateScaledScore(4, [4]), 50)
    assert.equal(calculateScaledScore(4, [4, 4, 4]), 50)
    assert.equal(calculateScaledScore(4, []), null)
  })

  it('formats totals to two decimal places', () => {
    assert.equal(formatRatingTotal(4.276), '4.28')
    assert.equal(formatRatingTotal(null), '—')
  })
})
