import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStyleScoreIndex, styleScaledScoreForRating } from '../styleScaledScore.js'

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

const ratings = [
  { id: 1, product_id: 1, total_weighted: 2 },
  { id: 2, product_id: 1, total_weighted: 4 },
  { id: 3, product_id: 2, total_weighted: 4 },
  { id: 4, product_id: 3, total_weighted: 5 },
  { id: 5, product_id: 4, total_weighted: 5 },
  { id: 6, product_id: 5, total_weighted: 3 },
  { id: 7, product_id: 2, total_weighted: 8 }
]

test('builds style populations only from products whose category resolves canonically', () => {
  const index = buildStyleScoreIndex({ ratings, products, categories })

  assert.equal(index.productStyleIds.get('1'), '10')
  assert.equal(index.productStyleIds.get('2'), '10')
  assert.equal(index.productStyleIds.get('3'), '11')
  assert.equal(index.productStyleIds.has('4'), false)
  assert.equal(index.productStyleIds.has('5'), false)
  assert.deepEqual(index.styleScores.get('10'), [2, 4, 4])
  assert.deepEqual(index.styleScores.get('11'), [5])
})

test('calculates tie-aware style percentile without using scores from other styles', () => {
  const index = buildStyleScoreIndex({ ratings, products, categories })
  const result = styleScaledScoreForRating({ product_id: 2, total_weighted: 4 }, index)

  assert.equal(result.style_id, '10')
  assert.equal(result.style_sample_size, 3)
  assert.equal(result.style_scaled_score, 75)
})

test('single-score and all-equal style populations use the existing 50 midpoint fallback', () => {
  const singleIndex = buildStyleScoreIndex({ ratings, products, categories })
  assert.equal(styleScaledScoreForRating({ product_id: 3, total_weighted: 5 }, singleIndex).style_scaled_score, 50)

  const equalIndex = buildStyleScoreIndex({
    ratings: [
      { product_id: 1, total_weighted: 4 },
      { product_id: 2, total_weighted: 4 }
    ],
    products,
    categories
  })
  assert.equal(styleScaledScoreForRating({ product_id: 1, total_weighted: 4 }, equalIndex).style_scaled_score, 50)
  assert.equal(styleScaledScoreForRating({ product_id: 1, total_weighted: 4 }, equalIndex).style_sample_size, 2)
})

test('returns unavailable when product style is missing, unresolved or score is invalid', () => {
  const index = buildStyleScoreIndex({ ratings, products, categories })

  assert.deepEqual(styleScaledScoreForRating({ product_id: 4, total_weighted: 5 }, index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_id: null
  })
  assert.deepEqual(styleScaledScoreForRating({ product_id: 5, total_weighted: 3 }, index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_id: null
  })
  assert.deepEqual(styleScaledScoreForRating({ product_id: 1, total_weighted: 7 }, index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_id: '10'
  })
})

test('conflicting duplicate product category identities fail closed for style population membership', () => {
  const index = buildStyleScoreIndex({
    ratings: [{ product_id: 1, total_weighted: 4 }],
    products: [
      { id: 1, product_category_id: 10 },
      { id: 1, product_category_id: 11 }
    ],
    categories
  })

  assert.equal(index.productStyleIds.has('1'), false)
  assert.deepEqual(styleScaledScoreForRating({ product_id: 1, total_weighted: 4 }, index), {
    style_scaled_score: null,
    style_sample_size: 0,
    style_id: null
  })
})
