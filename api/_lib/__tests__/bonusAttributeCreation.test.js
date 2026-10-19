import assert from 'node:assert/strict'
import test from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'
import { persistBonusWithCategory } from '../../bonus-attribute-data-proxy.js'

const input = { description: 'Personal favourite', point_value: 0.7 }
const ATTRIBUTE = COLLECTIONS.bonusAttributes
const MAPPING = COLLECTIONS.bonusAttributeCategoryMappings

const fixture = ({
  storedPointValue = '0.70',
  storedOwner = 'owner-1',
  storedDescription = input.description,
  attributeReadError = null,
  mappingReadError = null,
  mappingCreateError = null,
  mappingMissingId = false,
  mappingOwner = 'owner-1',
  mappingCategory = 10,
  mappingAttribute = 91
} = {}) => {
  const calls = []
  const provider = {
    async create(collection, body) {
      calls.push({ action: 'create', collection, body })
      if (collection === ATTRIBUTE) return { id: 91 }
      if (collection !== MAPPING) throw new Error('Unexpected collection')
      if (mappingCreateError) throw mappingCreateError
      return mappingMissingId ? {} : { id: 103 }
    },
    async get(collection, id) {
      calls.push({ action: 'get', collection, id })
      if (collection === ATTRIBUTE) {
        if (attributeReadError) throw attributeReadError
        return { id, user_id: storedOwner, description: storedDescription, point_value: storedPointValue }
      }
      if (collection === MAPPING) {
        if (mappingReadError) throw mappingReadError
        return { id, user_id: mappingOwner, category_id: mappingCategory, bonus_attribute_id: mappingAttribute }
      }
      throw new Error('Unexpected collection')
    },
    async remove(collection, id) {
      calls.push({ action: 'remove', collection, id })
      return { deleted: true }
    }
  }
  return { provider, calls }
}

const persist = (provider, existingAttributeIds = new Set(['1', '2'])) => persistBonusWithCategory({
  userId: 'owner-1', input, categoryId: 10, provider, existingAttributeIds
})
const actions = (calls) => calls.map(({ action, collection }) => [action, collection])

test('bonus creation verifies both persisted attribute and category mapping before acknowledging', async () => {
  const { provider, calls } = fixture()
  const saved = await persist(provider)
  assert.equal(saved.point_value, '0.70')
  assert.deepEqual(actions(calls), [
    ['create', ATTRIBUTE],
    ['get', ATTRIBUTE],
    ['create', MAPPING],
    ['get', MAPPING]
  ])
  assert.equal(calls[0].body.point_value, 0.7)
  assert.equal(calls[2].body.bonus_attribute_id, 91)
  assert.equal(calls[2].body.category_id, 10)
  assert.equal(calls[2].body.user_id, 'owner-1')
  assert.equal(calls[3].id, 103)
})

for (const mismatch of [
  { name: 'missing point value', storedPointValue: null },
  { name: 'provider changed point value', storedPointValue: '0.20' },
  { name: 'different description', storedDescription: 'Other attribute' }
]) {
  test(`bonus creation rejects ${mismatch.name} without deleting an ambiguously identified attribute`, async () => {
    const { provider, calls } = fixture(mismatch)
    await assert.rejects(
      persist(provider),
      (error) => error.status === 502 && error.code === 'BONUS_ATTRIBUTE_PERSISTENCE_MISMATCH'
    )
    assert.deepEqual(actions(calls), [
      ['create', ATTRIBUTE], ['get', ATTRIBUTE]
    ])
  })
}

test('bonus creation does not delete an unverified cross-owner record', async () => {
  const { provider, calls } = fixture({ storedOwner: 'owner-2' })
  await assert.rejects(persist(provider), (error) => error.code === 'BONUS_ATTRIBUTE_PERSISTENCE_MISMATCH')
  assert.deepEqual(actions(calls), [['create', ATTRIBUTE], ['get', ATTRIBUTE]])
})

test('a create acknowledgement echoing an existing owned ID cannot authorise mapping or deletion', async () => {
  for (const storedDescription of [input.description, 'An older private attribute']) {
    const { provider, calls } = fixture({ storedDescription })
    await assert.rejects(persist(provider, new Set(['91'])), (error) => error.code === 'BONUS_ATTRIBUTE_IDENTITY_UNCONFIRMED')
    assert.deepEqual(actions(calls), [['create', ATTRIBUTE]])
  }
})

test('missing pre-write identity baseline prevents any provider mutation', async () => {
  const { provider, calls } = fixture()
  await assert.rejects(persistBonusWithCategory({ userId: 'owner-1', input, categoryId: 10, provider }),
    (error) => error.code === 'BONUS_ATTRIBUTE_IDENTITY_UNCONFIRMED')
  assert.deepEqual(calls, [])
})

test('malformed create IDs never authorise readback, mapping or deletion', async () => {
  for (const id of ['091', '91/other', -1, 0, Number.MAX_SAFE_INTEGER + 1, {}, null]) {
    const { provider, calls } = fixture()
    provider.create = async () => { calls.push({ action: 'create', collection: ATTRIBUTE }); return { id } }
    await assert.rejects(persist(provider), (error) => error.code === 'BONUS_ATTRIBUTE_IDENTITY_UNCONFIRMED')
    assert.deepEqual(actions(calls), [['create', ATTRIBUTE]])
  }
})

test('bonus creation does not delete when attribute readback fails before owner verification', async () => {
  const { provider, calls } = fixture({ attributeReadError: Object.assign(new Error('Provider unavailable'), { status: 503 }) })
  await assert.rejects(persist(provider), (error) => error.status === 503)
  assert.deepEqual(actions(calls), [['create', ATTRIBUTE], ['get', ATTRIBUTE]])
})

for (const mismatch of [
  { name: 'mapping owner mismatch', mappingOwner: 'other-user' },
  { name: 'mapping category mismatch', mappingCategory: 11 },
  { name: 'mapping attribute mismatch', mappingAttribute: 92 }
]) {
  test(`bonus creation rejects ${mismatch.name} without destructive compensation of uncertain mapping`, async () => {
    const { provider, calls } = fixture(mismatch)
    await assert.rejects(
      persist(provider),
      (error) => error.status === 502 && error.code === 'BONUS_MAPPING_PERSISTENCE_MISMATCH'
    )
    assert.deepEqual(actions(calls), [
      ['create', ATTRIBUTE], ['get', ATTRIBUTE], ['create', MAPPING], ['get', MAPPING]
    ])
  })
}

test('bonus creation does not report success when mapping create omits identifier', async () => {
  const { provider, calls } = fixture({ mappingMissingId: true })
  await assert.rejects(
    persist(provider),
    (error) => error.status === 502 && error.code === 'BONUS_MAPPING_PERSISTENCE_MISMATCH'
  )
  assert.deepEqual(actions(calls), [['create', ATTRIBUTE], ['get', ATTRIBUTE], ['create', MAPPING]])
})

test('bonus creation preserves mapping failure and does not remove parent after ambiguous child write', async () => {
  const { provider, calls } = fixture({
    mappingCreateError: Object.assign(new Error('Mapping service unavailable'), { status: 503 })
  })
  await assert.rejects(persist(provider), (error) => error.status === 503)
  assert.deepEqual(actions(calls), [['create', ATTRIBUTE], ['get', ATTRIBUTE], ['create', MAPPING]])
})

test('bonus creation does not remove records after unreadable child mapping', async () => {
  const { provider, calls } = fixture({
    mappingReadError: Object.assign(new Error('Provider readback unavailable'), { status: 503 })
  })
  await assert.rejects(persist(provider), (error) => error.status === 503)
  assert.deepEqual(actions(calls), [
    ['create', ATTRIBUTE], ['get', ATTRIBUTE], ['create', MAPPING], ['get', MAPPING]
  ])
})
