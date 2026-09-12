import assert from 'node:assert/strict'
import test from 'node:test'

import {
  STYLE_RANK_TEXT_MIN_SAMPLE,
  buildStyleScoreIndex,
  styleScaledScoreForRating
} from '../styleScaledScore.js'

const categories = [
  { id: 10, category_name: 'Pale Ale' },
  { id: 11, category_name: 'Stout' }
]

const products = [
  { id: 1, product_category_id: 10 },
  { id: 2, product_category_id: 10 },
  { id: 3, product_category_id: 11 },
  { id: 4, product_category_id: 99 },
  { id: 5, product_category_id: null }
]

const complete = (rating) => ({ submission_state: 'complete', ...rating })

const ratings = [
  complete({ id: 1, product_id: 1, total_weighted: 2 }),
  complete({ id: 2, product_id: 1, total_weighted: 4 }),
  complete({ id: 3, product_id: 2, total_weighted: 4 }),
  complete({ id: 4, product_id: 3, total_weighted: 5 }),
  complete({ id: 5, product_id: 4, total_weighted: 5 }),
  complete({ id: 6, product_id: 5, total_weighted: 3 }),
  complete({ id: 7, product_id: 2, total_weighted: 8 }),
  complete({ id: 8, product_id: 2, total_weighted: 0 }),
  { id: 9, product_id: 2, total_weighted: 5, submission_state: 'pending' },
  { id: 10, product_id: 2, total_weighted: 5, submission_state: 'deleted' }
]

test('builds style populations only from durable completed scores with verified canonical categories', () => {
  const index = buildStyleScoreIndex({ ratings, products, categories })

  assert.equal(index.productStyleIds.get('1'), '10')
  assert.equal(index.productStyleIds.get('2'), '10')
  assert.equal(index.productStyleIds.get('3'), '11')
  assert.equal(index.productStyleIds.has('4'), false)
  assert.equal(index.productStyleIds.has('5'), false)
  assert.deepEqual(index.styleScores.get('10'), [2, 4, 4])
  assert.deepEqual(index.styleScores.get('11'), [5])
})

test('calculates tie-aware style percentile without using scores from another style', () => {
  const index = buildStyleScoreIndex({ ratings, products, categories })
  const result = styleScaledScoreForRating(complete({ product_id: 2, total_weighted: 4 }), index)

  assert.equal(result.style_id, '10')
  assert.equal(result.style_sample_size, 3)
  assert.equal(result.style_scaled_score, 75)
  assert.equal(result.style_rank_text_eligible, false)
})

test('single-score and all-equal style populations use the overall midpoint fallback', () => {
  const singleIndex = buildStyleScoreIndex({ ratings, products, categories })
  assert.equal(styleScaledScoreForRating(complete({ product_id: 3, total_weighted: 5 }), singleIndex).style_scaled_score, 50)

  const equalIndex = buildStyleScoreIndex({
    ratings: [
      complete({ product_id: 1, total_weighted: 4 }),
      complete({ product_id: 2, total_weighted: 4 })
    ],
    products,
    categories
  })
  const result = styleScaledScoreForRating(complete({ product_id: 1, total_weighted: 4 }), equalIndex)
  assert.equal(result.style_scaled_score, 50)
  assert.equal(result.style_sample_size, 2)
})

test('returns unavailable for missing, unresolved, incomplete or invalid rating style evidence', () => {
  const index = buildStyleScoreIndex({ ratings, products, categories })

  assert.deepEqual(styleScaledScoreForRating(complete({ product_id: 4, total_weighted: 5 }), index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_rank_text_eligible: false,
    style_id: null
  })
  assert.deepEqual(styleScaledScoreForRating(complete({ product_id: 5, total_weighted: 3 }), index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_rank_text_eligible: false,
    style_id: null
  })
  assert.deepEqual(styleScaledScoreForRating({ product_id: 1, total_weighted: 4, submission_state: 'pending' }, index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_rank_text_eligible: false,
    style_id: '10'
  })
  assert.deepEqual(styleScaledScoreForRating(complete({ product_id: 1, total_weighted: 7 }), index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_rank_text_eligible: false,
    style_id: '10'
  })
})

test('conflicting duplicate product category identities fail closed', () => {
  const index = buildStyleScoreIndex({
    ratings: [complete({ product_id: 1, total_weighted: 4 })],
    products: [
      { id: 1, product_category_id: 10 },
      { id: 1, product_category_id: 11 }
    ],
    categories
  })

  assert.equal(index.productStyleIds.has('1'), false)
  assert.equal(styleScaledScoreForRating(complete({ product_id: 1, total_weighted: 4 }), index).style_scaled_score, null)
})

test('rank text eligibility starts only at the documented twenty-rating sample threshold', () => {
  const makeRatings = (count) => Array.from({ length: count }, (_, index) => complete({
    id: index + 1,
    product_id: 1,
    total_weighted: 4
  }))

  const nineteen = buildStyleScoreIndex({ ratings: makeRatings(STYLE_RANK_TEXT_MIN_SAMPLE - 1), products, categories })
  const twenty = buildStyleScoreIndex({ ratings: makeRatings(STYLE_RANK_TEXT_MIN_SAMPLE), products, categories })

  assert.equal(styleScaledScoreForRating(complete({ product_id: 1, total_weighted: 4 }), nineteen).style_rank_text_eligible, false)
  assert.equal(styleScaledScoreForRating(complete({ product_id: 1, total_weighted: 4 }), twenty).style_rank_text_eligible, true)
})
