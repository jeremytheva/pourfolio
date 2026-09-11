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

  submitRating(rating) {
    return apiRequest('/ratings/submit', {
      method: 'POST',
      body: rating
    })
  },

  getUserRatings() {
    return apiRequest('/ratings/mine')
  },

  deleteRating(ratingId) {
    return apiRequest(`/ratings/${encodeURIComponent(ratingId)}`, { method: 'DELETE' })
  }
}
