import { calculateScaledScore } from '../../src/lib/ratingFormulaV1.js'

const positiveId = (value) => {
  const text = String(value ?? '').trim()
  return /^[1-9]\d*$/.test(text) ? text : null
}

const validWeightedScore = (value) => {
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= 5 ? score : null
}

export const buildStyleScoreIndex = ({ ratings = [], products = [], categories = [] } = {}) => {
  const categoryIds = new Set(
    categories.map((category) => positiveId(category?.id)).filter(Boolean)
  )
  const productStyleIds = new Map()
  const ambiguousProducts = new Set()

  for (const product of products) {
    const productId = positiveId(product?.id)
    const styleId = positiveId(product?.product_category_id)
    if (!productId || !styleId || !categoryIds.has(styleId)) continue

    if (productStyleIds.has(productId) && productStyleIds.get(productId) !== styleId) {
      productStyleIds.delete(productId)
      ambiguousProducts.add(productId)
      continue
    }
    if (!ambiguousProducts.has(productId)) productStyleIds.set(productId, styleId)
  }

  const styleScores = new Map()
  for (const rating of ratings) {
    const productId = positiveId(rating?.product_id)
    const score = validWeightedScore(rating?.total_weighted)
    const styleId = productId && !ambiguousProducts.has(productId) ? productStyleIds.get(productId) : null
    if (!styleId || score === null) continue
    const population = styleScores.get(styleId) || []
    population.push(score)
    styleScores.set(styleId, population)
  }

  return Object.freeze({ productStyleIds, styleScores })
}

export const styleScaledScoreForRating = (rating, index) => {
  const productId = positiveId(rating?.product_id)
  const score = validWeightedScore(rating?.total_weighted)
  const styleId = productId ? index?.productStyleIds?.get(productId) : null
  const population = styleId ? index?.styleScores?.get(styleId) : null

  if (!styleId || score === null || !Array.isArray(population) || population.length === 0) {
    return Object.freeze({ style_scaled_score: null, style_sample_size: 0, style_id: styleId || null })
  }

  return Object.freeze({
    style_scaled_score: calculateScaledScore(score, population),
    style_sample_size: population.length,
    style_id: styleId
  })
}

export const __testables = { positiveId, validWeightedScore }
