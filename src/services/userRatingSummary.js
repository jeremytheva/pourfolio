const sameId = (left, right) => String(left) === String(right)

const ratingTotal = (rating) => {
  const raw = rating?.total_weighted
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 && value <= 5 ? value : null
}

export const buildUserProductRatingSummary = (payload, productId) => {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) return null

  const totals = payload.items
    .filter((rating) => rating && typeof rating === 'object' && sameId(rating.product_id, productId))
    .map(ratingTotal)
    .filter((value) => value !== null)

  if (!totals.length) return null

  return Object.freeze({
    count: totals.length,
    average: Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2))
  })
}
