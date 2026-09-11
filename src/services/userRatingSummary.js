const sameId = (left, right) => String(left) === String(right)

export const buildUserProductRatingSummary = (payload, productId) => {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) return null

  const matching = payload.items.filter((rating) => rating && typeof rating === 'object' && sameId(rating.product_id, productId))
  const totals = matching
    .map((rating) => Number(rating.total_weighted))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 5)

  if (!totals.length) return null

  const latest = matching.find((rating) => Number.isFinite(Number(rating.total_weighted)) && Number(rating.total_weighted) >= 0 && Number(rating.total_weighted) <= 5)
  return Object.freeze({
    count: totals.length,
    average: Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2)),
    advanced_scores: latest?.advanced_scores || null
  })
}
