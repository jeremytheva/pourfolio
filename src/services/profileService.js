import { apiRequest } from '../lib/nocodeBackend.js'
import { normalisePublicProfileId, validatePublicProfileResponse } from './publicProfileResponse.js'

// Persistent profile storage is not deployed for the current launch contract.
// Browser code may read the session-backed owner projection. Public-profile
// source support is prepared here but remains fail-closed server-side until the
// governed provider migration in #422 is deployed and verified.
export const getCurrentUserProfile = () => apiRequest('/profile')

export const getPublicUserProfile = async (publicProfileId) => {
  const id = normalisePublicProfileId(publicProfileId)
  const payload = await apiRequest(`/profiles/${encodeURIComponent(id)}`)
  return validatePublicProfileResponse(payload, id)
}

export const profileService = {
  getCurrentUserProfile,
  getPublicUserProfile
}
