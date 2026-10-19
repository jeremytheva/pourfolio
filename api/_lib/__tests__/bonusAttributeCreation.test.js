import assert from 'node:assert/strict'
import test from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'
import { persistBonusWithCategory } from '../../bonus-attribute-data-proxy.js'

const input = { description: 'Personal favourite', point_value: 0.7 }

const fixture = ({ storedPointValue = '0.70', storedOwner = 'owner-1', storedDescription = input.description, failMapping = false, readError = null } = {}) => {
  const calls = []
  const provider = {
    async create(collection, body) {
      calls.push({ action: 'create', collection, body })
      if (collection === COLLECTIONS.bonusAttributes) return { id: 91 }
      if (failMapping) throw Object.assign(new Error('Mapping service unavailable'), { status: 503 })
      return { id: 103 }
    },
    async get(collection, id) {
      calls.push({ action: 'get', collection, id })
      if (readError) throw readError
      return { id, user_id: storedOwner, description: storedDescription, point_value: storedPointValue }
    },
    async remove(collection, id) {
      calls.push({ action: 'remove', collection, id })
      return { deleted: true }
    }
  }
  return { provider, calls }
}

test('bonus creation reads back the provider point value and links the saved attribute', async () => {
  const { provider, calls } = fixture()
  const saved = await persistBonusWithCategory({ userId: 'owner-1', input, categoryId: 10, provider })
  assert.equal(saved.point_value, '0.70')
  assert.deepEqual(calls.map(({ action, collection }) => [action, collection]), [
    ['create', COLLECTIONS.bonusAttributes],
    ['get', COLLECTIONS.bonusAttributes],
    ['create', COLLECTIONS.bonusAttributeCategoryMappings]
  ])
  assert.equal(calls[0].body.point_value, 0.7)
  assert.equal(calls[2].body.bonus_attribute_id, 91)
})

for (const mismatch of [
  { name: 'missing point value', storedPointValue: null },
  { name: 'provider changed point value', storedPointValue: '0.20' },
  { name: 'different description', storedDescription: 'Other attribute' }
]) {
  test(`bonus creation rejects ${mismatch.name} without creating a category mapping`, async () => {
    const { provider, calls } = fixture(mismatch)
    await assert.rejects(
      persistBonusWithCategory({ userId: 'owner-1', input, categoryId: 10, provider }),
      (error) => error.status === 502 && error.code === 'BONUS_ATTRIBUTE_PERSISTENCE_MISMATCH'
    )
    assert.deepEqual(calls.map(({ action }) => action), ['create', 'get', 'remove'])
    assert.deepEqual(calls[2], { action: 'remove', collection: COLLECTIONS.bonusAttributes, id: 91 })
  })
}

test('bonus creation does not delete an unverified cross-owner record', async () => {
  const { provider, calls } = fixture({ storedOwner: 'owner-2' })
  await assert.rejects(
    persistBonusWithCategory({ userId: 'owner-1', input, categoryId: 10, provider }),
    (error) => error.status === 502 && error.code === 'BONUS_ATTRIBUTE_PERSISTENCE_MISMATCH'
  )
  assert.deepEqual(calls.map(({ action }) => action), ['create', 'get'])
})

test('bonus creation does not delete when provider readback fails before owner verification', async () => {
  const { provider, calls } = fixture({ readError: Object.assign(new Error('Provider unavailable'), { status: 503 }) })
  await assert.rejects(
    persistBonusWithCategory({ userId: 'owner-1', input, categoryId: 10, provider }),
    (error) => error.status === 503
  )
  assert.deepEqual(calls.map(({ action }) => action), ['create', 'get'])
})

test('bonus creation preserves mapping failure and compensates the new attribute', async () => {
  const { provider, calls } = fixture({ failMapping: true })
  await assert.rejects(
    persistBonusWithCategory({ userId: 'owner-1', input, categoryId: 10, provider }),
    (error) => error.status === 503
  )
  assert.deepEqual(calls.map(({ action }) => action), ['create', 'get', 'create', 'remove'])
})
