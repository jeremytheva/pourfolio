import assert from 'node:assert/strict'
import test from 'node:test'

import { validateBonusRatingMappings, summariseBonusPointValues, verifyExistingPrivateBonusReadback } from '../audit-live-bonus-rating-mapping.js'

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

test('reports legacy missing points and explicit global values without row-level identifiers', () => {
  const attributes = [
    { id: 1, user_id: null, description: 'Historical global', point_value: null },
    { id: 2, user_id: '', description: 'Stored half point', point_value: '0.50' },
    { id: 3, user_id: 'account-secret', description: 'Private choice', point_value: 0.7 },
    { id: 4, user_id: null, description: 'Blank legacy', point_value: '' }
  ]
  const result = summariseBonusPointValues(attributes)
  assert.deepEqual(result, {
    status: 'LEGACY_FALLBACK_PRESENT',
    total: 4,
    global: 3,
    private: 1,
    explicitlyStored: 2,
    missingOrBlank: 2,
    invalidNumeric: 0,
    outsideCustomPointRange: 0,
    globalExplicitValueCounts: [{ value: 0.5, count: 1 }]
  })
  assert.equal(JSON.stringify(result).includes('account-secret'), false)
  assert.equal(JSON.stringify(result).includes('Historical global'), false)
  assert.equal(JSON.stringify(result).includes('Private choice'), false)
})

test('detects malformed and out-of-range live point values without substituting defaults', () => {
  const result = summariseBonusPointValues([
    { user_id: null, point_value: 'not-a-number' },
    { user_id: null, point_value: 0.25 },
    { user_id: null, point_value: 0.9 },
    { user_id: null, point_value: 0.1 }
  ])
  assert.equal(result.status, 'REVIEW_REQUIRED')
  assert.equal(result.invalidNumeric, 1)
  assert.equal(result.outsideCustomPointRange, 2)
  assert.equal(result.explicitlyStored, 3)
  assert.deepEqual(result.globalExplicitValueCounts, [
    { value: 0.1, count: 1 },
    { value: 0.25, count: 1 },
    { value: 0.9, count: 1 }
  ])
})

test('reports no attributes as inconclusive and separately records complete values', () => {
  assert.equal(summariseBonusPointValues([]).status, 'INCONCLUSIVE_NO_ATTRIBUTES')
  assert.equal(summariseBonusPointValues([{ id: 1, user_id: null, point_value: '0.20' }]).status, 'COMPLETE')
})

test('existing read-only relationship audit includes a point-value summary without changing relationship status', () => {
  const result = validateBonusRatingMappings({
    mappings: [{ id: 1, user_id: 'u1', rating_id: 10, bonus_attribute_id: 20 }],
    bonusAttributes: [{ id: 20, user_id: null, point_value: null }],
    ratings: [{ id: 10, user_id: 'u1' }]
  })
  assert.equal(result.status, 'PASS')
  assert.equal(result.bonusPointValues.status, 'LEGACY_FALLBACK_PRESENT')
  assert.equal(result.bonusPointValues.missingOrBlank, 1)
})

const privateAttribute = { id: 91, user_id: 'owner-1', description: 'Private bonus', point_value: '0.70' }
const overall = { id: 10, user_id: null, category: 'Overall' }
const privateMapping = { id: 103, user_id: 'owner-1', category_id: 10, bonus_attribute_id: 91 }
const readbackFixture = (overrides = {}) => {
  const reads = []
  const provider = {
    async get(collection, id) {
      reads.push([collection, id])
      if (overrides.error) throw new Error('Provider temporarily unavailable')
      if (collection === 'bonus_attributes') return { ...privateAttribute, ...overrides.attribute }
      if (collection === 'bonus_attribute_category_mapping') return { ...privateMapping, ...overrides.mapping }
      throw new Error('Unexpected provider access')
    }
  }
  return { provider, reads }
}

test('read-only existing-private-pair probe validates both persisted rows without leaking private details', async () => {
  const { provider, reads } = readbackFixture()
  const result = await verifyExistingPrivateBonusReadback({
    attributes: [privateAttribute], categoryMappings: [privateMapping], categories: [overall], provider
  })
  assert.deepEqual(result, { status: 'EXISTING_PRIVATE_PAIR_READBACK_OK', checked: 1 })
  assert.deepEqual(reads, [['bonus_attributes', 91], ['bonus_attribute_category_mapping', 103]])
  assert.equal(JSON.stringify(result).includes('owner-1'), false)
  assert.equal(JSON.stringify(result).includes('0.7'), false)
})

test('read-only pair probe is inconclusive without an already-owned Overall mapping and never reads unowned rows', async () => {
  const { provider, reads } = readbackFixture()
  const result = await verifyExistingPrivateBonusReadback({
    attributes: [privateAttribute],
    categoryMappings: [{ ...privateMapping, user_id: 'other-account' }],
    categories: [overall], provider
  })
  assert.deepEqual(result, { status: 'INCONCLUSIVE_NO_PRIVATE_OVERALL_PAIR', checked: 0 })
  assert.deepEqual(reads, [])
})

test('read-only probe detects actual decimal value drift', async () => {
  const { provider } = readbackFixture({ attribute: { point_value: '0.20' } })
  const result = await verifyExistingPrivateBonusReadback({
    attributes: [privateAttribute], categoryMappings: [privateMapping], categories: [overall], provider
  })
  assert.deepEqual(result, { status: 'READBACK_MISMATCH', checked: 1 })
})

test('read-only probe detects ownership and mapping field drift', async () => {
  for (const change of [
    { attribute: { user_id: 'other-account' } },
    { mapping: { user_id: 'other-account' } },
    { mapping: { bonus_attribute_id: 99 } },
    { mapping: { category_id: 11 } }
  ]) {
    const { provider } = readbackFixture(change)
    const result = await verifyExistingPrivateBonusReadback({
      attributes: [privateAttribute], categoryMappings: [privateMapping], categories: [overall], provider
    })
    assert.deepEqual(result, { status: 'READBACK_MISMATCH', checked: 1 })
  }
})

test('read-only probe reports provider read failure without revealing record details', async () => {
  const { provider } = readbackFixture({ error: true })
  const result = await verifyExistingPrivateBonusReadback({
    attributes: [privateAttribute], categoryMappings: [privateMapping], categories: [overall], provider
  })
  assert.deepEqual(result, { status: 'READBACK_UNAVAILABLE', checked: 1 })
})
