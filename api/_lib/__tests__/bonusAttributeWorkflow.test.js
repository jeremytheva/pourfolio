import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'
import { loadBonusCatalogue } from '../bonusAttributeCatalogue.js'
import { dataProvider } from '../dataProvider.js'
import { sanitiseCustomBonusAttributeInput } from '../dataPolicy.js'
import { __testables as ratingTestables } from '../../rating-data-proxy.js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

test('bonus catalogue uses provider categories, hides other users custom rows and applies the legacy 0.2 fallback', async () => {
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.bonusAttributes) return [
      { id: 1, user_id: null, description: 'Hop burst', point_value: null },
      { id: 2, user_id: 'owner-1', description: 'Personal favourite', point_value: 0.5 },
      { id: 3, user_id: 'owner-2', description: 'Other user private attribute', point_value: 0.8 },
      { id: 4, user_id: null, description: 'Unmapped legacy attribute', point_value: '' }
    ]
    if (collection === COLLECTIONS.bonusAttributeCategories) return [
      { id: 10, user_id: null, category: 'Aroma' },
      { id: 11, user_id: null, category: 'Overall' },
      { id: 12, user_id: 'owner-2', category: 'Private category' }
    ]
    if (collection === COLLECTIONS.bonusAttributeCategoryMappings) return [
      { id: 20, user_id: null, category_id: 10, bonus_attribute_id: 1 },
      { id: 21, user_id: 'owner-1', category_id: 11, bonus_attribute_id: 2 },
      { id: 22, user_id: 'owner-2', category_id: 12, bonus_attribute_id: 3 }
    ]
    return []
  }

  const result = await loadBonusCatalogue('owner-1')

  assert.deepEqual(result.bonusCategories, [
    { key: 'aroma', name: 'Aroma' },
    { key: 'overall', name: 'Overall' }
  ])
  assert.deepEqual(result.bonusAttributes.map(({ id, effective_point_value, category_keys }) => ({ id, effective_point_value, category_keys })), [
    { id: 1, effective_point_value: 0.2, category_keys: ['aroma'] },
    { id: 4, effective_point_value: 0.2, category_keys: ['overall'] },
    { id: 2, effective_point_value: 0.5, category_keys: ['overall'] }
  ])
  assert.equal(result.bonusAttributes.some((attribute) => attribute.id === 3), false)
})

test('server replaces a client supplied Bonus score with the derived score', () => {
  const attributes = [
    { id: 2, attribute_name: 'Appearance' },
    { id: 7, attribute_name: 'Bonus' }
  ]
  const scores = ratingTestables.scoresWithDerivedBonus([
    { attributeId: 2, score: 6 },
    { attributeId: 7, score: 2 }
  ], attributes, 1)

  assert.deepEqual(scores, [
    { attributeId: 2, score: 6 },
    { attributeId: 7, score: 1 }
  ])
})

test('custom bonus attributes default to caller supplied 0.2 and enforce 0.1 to 0.8 in 0.1 steps', () => {
  assert.deepEqual(sanitiseCustomBonusAttributeInput({
    description: '  Long   finish  ',
    point_value: 0.2
  }), {
    description: 'Long finish',
    point_value: 0.2
  })

  assert.throws(() => sanitiseCustomBonusAttributeInput({ description: 'Invalid low', point_value: 0 }))
  assert.throws(() => sanitiseCustomBonusAttributeInput({ description: 'Invalid high', point_value: 0.9 }))
  assert.throws(() => sanitiseCustomBonusAttributeInput({ description: 'Invalid step', point_value: 0.25 }))
})
