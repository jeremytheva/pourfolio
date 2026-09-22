import { apiRequest } from '../lib/nocodeBackend.js'
import { sortRatingAttributes } from '../utils/ratingAttributeOrder.js'

export const ratingService = {
  getRatingForm(productId) {
    const params = new URLSearchParams({ product_id: String(productId) })
    return apiRequest(`/rating-form?${params}`).then((payload) => ({
      ...payload,
      attributes: sortRatingAttributes(payload?.attributes)
    }))
  },

  createBonusAttribute({ description, pointValue }) {
    return apiRequest('/bonus-attributes', {
      method: 'POST',
      body: { description, pointValue }
    })
  },

  submitRating(rating) {
    return apiRequest('/ratings/submit', {
      method: 'POST',
      body: rating
    })
  },

  getUserRatings(productId = null) {
    if (productId === null || productId === undefined || productId === '') return apiRequest('/ratings/mine')
    const params = new URLSearchParams({ product_id: String(productId) })
    return apiRequest(`/ratings/mine?${params}`)
  },
  getHistory({ page = 1, limit = 20, q = '', from = '', to = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (q.trim()) params.set('q', q.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiRequest(`/ratings/history?${params}`)
  },

  deleteRating(ratingId) {
    return apiRequest(`/ratings/${encodeURIComponent(ratingId)}`, { method: 'DELETE' })
  }
}
