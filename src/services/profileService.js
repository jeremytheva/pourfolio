import { apiRequest } from '../lib/nocodeBackend.js'
import { normalisePublicProfileId, validatePublicProfileResponse } from './publicProfileResponse.js'

export const getCurrentUserProfile = () => apiRequest('/profile')

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
