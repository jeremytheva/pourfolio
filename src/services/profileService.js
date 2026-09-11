import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { normalisePublicProfileId, validatePublicProfileResponse } from './publicProfileResponse.js'

export const getCurrentUserProfile = async () => {
  const payload = await apiRequest('/profile')
  if (!payload?.profile?.public_id) {
    throw new ApiError('Profile editing is not available yet. Your account details currently come from your authenticated session.', {
      code: 'profile_persistence_unavailable'
    })
  }
  return payload
}

export const updateCurrentUserProfile = (updates) => apiRequest('/profile', {
  method: 'PUT',
  body: updates
})

export const getPublicUserProfile = async (publicProfileId) => {
  const id = normalisePublicProfileId(publicProfileId)
  const payload = await apiRequest(`/profiles/${encodeURIComponent(id)}`)
  return validatePublicProfileResponse(payload, id)
}

export const profileService = {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  getPublicUserProfile
}
