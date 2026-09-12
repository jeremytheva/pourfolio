import { completedRatingTotal } from '../lib/completedRatingContract.js'

const sameId = (left, right) => String(left) === String(right)

export const buildUserProductRatingSummary = (payload, productId) => {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) return null

  const totals = payload.items
    .filter((rating) => rating && typeof rating === 'object' && sameId(rating.product_id, productId))
    .map((rating) => completedRatingTotal(rating.total_weighted))
    .filter((value) => value !== null)

  if (!totals.length) return null

  return Object.freeze({
    count: totals.length,
    average: Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2))
  })
}
