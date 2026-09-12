import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../dataProvider.js'
import { __testables } from '../../current-data-proxy.js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

const ratingAttributes = [
  { id: 2, attribute_name: 'Appearance', is_scored: 1, weighting: 0.1 },
  { id: 3, attribute_name: 'Aroma', is_scored: 1, weighting: 0.1 },
  { id: 4, attribute_name: 'Mouthfeel', is_scored: 1, weighting: 0.2 },
  { id: 5, attribute_name: 'Flavour', is_scored: 1, weighting: 0.25 },
  { id: 6, attribute_name: 'Follow', is_scored: 1, weighting: 0.25 },
  { id: 7, attribute_name: 'Bonus', is_scored: 1, weighting: 0.1 }
]

const scores = [
  { attributeId: 2, score: 6 },
  { attributeId: 3, score: 5 },
  { attributeId: 4, score: 5 },
  { attributeId: 5, score: 6 },
  { attributeId: 6, score: 5 },
  { attributeId: 7, score: 1 }
]

test('current-schema rating submission writes the supplied bonus_attributes_id field', async () => {
  const created = []
  let nextId = 100

  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.products) return { id: Number(id), product_name: 'Contract Ale' }
    return null
  }
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.ratingAttributes) return ratingAttributes
    if (collection === COLLECTIONS.bonusAttributes) return [{ id: 7 }]
    return []
  }
  dataProvider.create = async (collection, payload) => {
    const record = { id: nextId++, ...payload }
    created.push({ collection, payload })
    return record
  }
  dataProvider.remove = async () => null

  const result = response()
  await __testables.submitRating({
    body: {
      productId: 10,
      scores,
      bonusAttributeIds: [7]
    }
  }, result, { id: 'user-contract' }, 'contract-request')

  assert.equal(result.statusCode, 201)
  const mapping = created.find(({ collection }) => collection === COLLECTIONS.bonusRatingMappings)
  assert.deepEqual(mapping?.payload, {
    user_id: 'user-contract',
    rating_id: 100,
    bonus_attributes_id: '7'
  })
  assert.equal(Object.hasOwn(mapping?.payload || {}, 'bonus_attribute_id'), false)
})
