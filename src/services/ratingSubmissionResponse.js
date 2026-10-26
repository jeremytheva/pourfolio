import { ApiError } from '../lib/nocodeBackend.js'
import { completedRatingTotal } from '../lib/completedRatingContract.js'

const record = (value) => value && typeof value === 'object' && !Array.isArray(value)
const identity = (value) => {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return null
  if (!['string', 'number'].includes(typeof value)) return null
  const result = String(value)
  return /^[1-9]\d*$/.test(result) ? result : null
}

// HTTP success alone is not a persistence receipt. Keep the local copy until
// the gateway confirms the specific submission, product and complete child set.
export const validateRatingSubmissionResponse = (payload, submitted) => {
  const rating = payload?.rating
  const expectedScores = Array.isArray(submitted?.scores) ? submitted.scores.length + 1 : null
  const expectedBonuses = Array.isArray(submitted?.bonusAttributeIds)
    ? new Set(submitted.bonusAttributeIds.map(String)).size : 0
  if (!record(payload) || !record(rating) || !identity(rating.id) ||
      !identity(submitted?.submissionId) ||
      (rating.rating_id !== undefined && identity(rating.rating_id) !== identity(submitted.submissionId)) ||
      !identity(submitted?.productId) || identity(rating.product_id) !== identity(submitted.productId) ||
      completedRatingTotal(rating.total_weighted) === null ||
      expectedScores === null || payload.scoreCount !== expectedScores ||
      payload.bonusCount !== expectedBonuses || typeof payload.duplicate !== 'boolean') {
    throw new ApiError('The rating submission could not be confirmed. Your local draft has been retained when storage is available. Check your history before retrying.', {
      code: 'RATING_SUBMISSION_UNCONFIRMED'
    })
  }
  return payload
}
