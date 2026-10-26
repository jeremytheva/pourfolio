import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRatingSubmissionResponse } from './ratingSubmissionResponse.js'

const request = { productId: '4', submissionId: 1700000000000001, scores: [{ attributeId: 2, score: 4 }], bonusAttributeIds: ['12'] }
const receipt = { rating: { id: 99, rating_id: request.submissionId, product_id: 4, total_weighted: 3 }, scoreCount: 2, bonusCount: 1, duplicate: false }

test('only a matching completed receipt confirms a submission or duplicate', () => {
  assert.equal(validateRatingSubmissionResponse(receipt, request), receipt)
  assert.equal(validateRatingSubmissionResponse({ ...receipt, duplicate: true }, request).duplicate, true)
  const { rating_id, ...currentGatewayRating } = receipt.rating
  assert.equal(validateRatingSubmissionResponse({ ...receipt, rating: currentGatewayRating }, request).rating, currentGatewayRating)
  for (const invalid of [null, {}, [], { ...receipt, rating: null }, { ...receipt, scoreCount: 0 }, { ...receipt, bonusCount: 0 }, { ...receipt, duplicate: undefined },
    ...[{ id: 0 }, { rating_id: request.submissionId + 1 }, { product_id: 5 }, { total_weighted: 0 }, { total_weighted: 6 }].map((change) => ({ ...receipt, rating: { ...receipt.rating, ...change } }))]) {
    assert.throws(() => validateRatingSubmissionResponse(invalid, request), { code: 'RATING_SUBMISSION_UNCONFIRMED' })
  }
})
