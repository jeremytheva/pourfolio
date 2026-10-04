import assert from 'node:assert/strict'
import test from 'node:test'

import { validateBonusRatingMappings } from '../audit-live-bonus-rating-mapping.js'

test('classifies provider rows that use bonus_attributes_id only', () => {
  const result = validateBonusRatingMappings({
    mappings: [{ id: 1, user_id: 'u1', rating_id: 10, bonus_attributes_id: 20 }],
    bonusAttributes: [{ id: 20 }],
    ratings: [{ id: 10, user_id: 'u1' }]
  })

  assert.equal(result.status, 'PASS')
  assert.equal(result.verification, 'PLURAL_ONLY')
  assert.equal(result.pluralFieldRows, 1)
  assert.equal(result.singularFieldRows, 0)
})

test('classifies provider rows that use bonus_attribute_id only', () => {
  const result = validateBonusRatingMappings({
    mappings: [{ id: 1, user_id: 'u1', rating_id: 10, bonus_attribute_id: 20 }],
    bonusAttributes: [{ id: 20 }],
    ratings: [{ id: 10, user_id: 'u1' }]
  })

  assert.equal(result.status, 'PASS')
  assert.equal(result.verification, 'SINGULAR_ONLY')
  assert.equal(result.pluralFieldRows, 0)
  assert.equal(result.singularFieldRows, 1)
})

test('rejects conflicting dual-field provider rows', () => {
  const result = validateBonusRatingMappings({
    mappings: [{ id: 1, user_id: 'u1', rating_id: 10, bonus_attributes_id: 20, bonus_attribute_id: 21 }],
    bonusAttributes: [{ id: 20 }, { id: 21 }],
    ratings: [{ id: 10, user_id: 'u1' }]
  })

  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.verification, 'MIXED_PROVIDER_STATE')
  assert.equal(result.conflictingDualFieldRows, 1)
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
