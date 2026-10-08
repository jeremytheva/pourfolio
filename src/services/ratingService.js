import { apiRequest } from '../lib/nocodeBackend.js'
import { sortRatingAttributes } from '../utils/ratingAttributeOrder.js'
import { validateRatingBreakdown } from './ratingBreakdownResponse.js'
import { normalisePublicProfileId } from './publicProfileResponse.js'
import { validateSharedRatings } from './sharedRatingResponse.js'

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
  getHistory({ page = 1, limit = 20, q = '', from = '', to = '', ratingId = null } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (q.trim()) params.set('q', q.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (ratingId !== null) params.set('rating_id', String(ratingId))
    return apiRequest(`/ratings/history?${params}`)
  },

  deleteRating(ratingId) {
    return apiRequest(`/ratings/${encodeURIComponent(ratingId)}`, { method: 'DELETE' }).catch((error) => {
      if (error.code === 'RATING_DELETE_VERIFICATION_PENDING') error.message = 'Rating deletion could not be confirmed yet. Please retry.'
      if (error.code === 'RATING_DELETE_WORKFLOW_UNAVAILABLE') error.message = 'This rating cannot be deleted until its stored workflow is repaired.'
      throw error
    })
  },
  getSharedProductRatings(productId, { page = 1 } = {}) {
    return apiRequest(`/ratings/shared?${new URLSearchParams({ product_id: String(productId), page: String(page), limit: '20' })}`)
      .then((payload) => validateSharedRatings(payload, productId))
  },
  getBreakdown(ratingId, publicProfileId = null) {
    const path = publicProfileId === null ? `/ratings/${encodeURIComponent(ratingId)}/breakdown`
      : `/profiles/${encodeURIComponent(normalisePublicProfileId(publicProfileId))}/ratings/${encodeURIComponent(ratingId)}/breakdown`
    return apiRequest(path).then(validateRatingBreakdown)
  }
}
