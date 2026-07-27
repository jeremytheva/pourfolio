import { apiRequest } from '../lib/nocodeBackend.js'

export const getCurrentUserProfile = () => apiRequest('/profile')

export const updateCurrentUserProfile = (updates) => apiRequest('/profile', {
  method: 'PUT',
  body: updates
})
