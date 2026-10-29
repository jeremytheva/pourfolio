import { ApiError, apiRequest } from '../lib/nocodeBackend.js'

export const validateAdminReviewCapabilities = (payload, expectedSubject) => {
  const keys = ['version', 'subjectId', 'capabilities', 'mode', 'moderationAvailable']
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      Object.keys(payload).length !== keys.length || keys.some((key) => !Object.hasOwn(payload, key)) ||
      payload.version !== 1 || typeof payload.subjectId !== 'string' || !payload.subjectId || payload.subjectId !== expectedSubject ||
      payload.mode !== 'read_only' || payload.moderationAvailable !== false || !Array.isArray(payload.capabilities) ||
      payload.capabilities.length > 1 || payload.capabilities.some((value) => value !== 'catalogue.review')) {
    throw new ApiError('Admin access could not be verified. Please try again.', { status: 502, code: 'invalid_admin_capabilities' })
  }
  return Object.freeze({ subjectId: payload.subjectId, canReview: payload.capabilities.includes('catalogue.review') })
}

export const adminReviewService = {
  async getCapabilities(subjectId) {
    return validateAdminReviewCapabilities(await apiRequest('/profile/capabilities'), subjectId)
  }
}
