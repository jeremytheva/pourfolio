import assert from 'node:assert/strict'
import test from 'node:test'

import { validateBonusRatingMappings } from '../audit-live-bonus-rating-mapping.js'

test('validates existing provider rows through bonus_attributes_id', () => {
  const result = validateBonusRatingMappings({
    mappings: [{ id: 1, user_id: 'u1', rating_id: 10, bonus_attributes_id: 20 }],
    bonusAttributes: [{ id: 20 }],
    ratings: [{ id: 10, user_id: 'u1' }]
  })

  assert.deepEqual(result, {
    status: 'PASS',
    mode: 'read-only',
    verification: 'PROVIDER_VERIFIED_EXISTING_ROWS',
    field: 'bonus_attributes_id',
    mappingsExamined: 1,
    bonusAttributesExamined: 1,
    ratingsExamined: 1
  })
})

test('rejects the singular category-mapping field on rating mappings', () => {
  assert.throws(() => validateBonusRatingMappings({
    mappings: [{ id: 1, user_id: 'u1', rating_id: 10, bonus_attribute_id: 20 }],
    bonusAttributes: [{ id: 20 }],
    ratings: [{ id: 10, user_id: 'u1' }]
  }), /must not expose the singular category-mapping field/)
})

test('reports no-row provider state as inconclusive rather than verified', () => {
  const result = validateBonusRatingMappings({
    mappings: [],
    bonusAttributes: [{ id: 20 }],
    ratings: [{ id: 10, user_id: 'u1' }]
  })
  assert.equal(result.status, 'INCONCLUSIVE')
  assert.equal(result.verification, 'INCONCLUSIVE_NO_ROWS')
})
