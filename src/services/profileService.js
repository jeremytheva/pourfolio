import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { normalisePublicProfileId, validatePublicProfileResponse } from './publicProfileResponse.js'

export const getCurrentUserProfile = async () => {
  const payload = await apiRequest('/profile')
  if (!payload?.profile?.public_id) {
    throw new ApiError('Profile data could not be resolved.', {
      code: 'profile_response_invalid'
    })
  }
  return payload
}

export const updateCurrentUserProfile = (updates) => apiRequest('/profile', {
  method: 'PUT',
  body: updates
})

export const getPublicUserProfile = async (publicProfileId, { page = 1, ratingId = null } = {}) => {
  const id = normalisePublicProfileId(publicProfileId)
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (ratingId !== null) params.set('rating_id', String(ratingId))
  const payload = await apiRequest(`/profiles/${encodeURIComponent(id)}?${params}`)
  return validatePublicProfileResponse(payload, id, ratingId)
}

export const profileService = {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  getPublicUserProfile
}
