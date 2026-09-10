import { apiRequest } from '../lib/nocodeBackend.js'

// Persistent profile storage is not deployed for the current launch contract.
// Browser code may read the session-backed profile projection only; writes stay
// disabled until a governed provider migration promotes the capability.
export const getCurrentUserProfile = () => apiRequest('/profile')
