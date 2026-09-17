import assert from 'node:assert/strict'
import test from 'node:test'

import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../_lib/dataProvider.js'
import { __testables } from '../rating-data-proxy-live-schema.js'

const withProviderMocks = async (overrides, callback) => {
  const original = {}
  for (const [name, replacement] of Object.entries(overrides)) {
    original[name] = dataProvider[name]
    dataProvider[name] = replacement
  }
  try { await callback() } finally {
    for (const [name, value] of Object.entries(original)) dataProvider[name] = value
  }
}

const stateProvider = () => {
  const state = {
    [COLLECTIONS.ratingScores]: [],
    [COLLECTIONS.bonusRatingMappings]: []
  }
  let nextId = 200
  const list = async (collection, filters = {}) => (state[collection] || []).filter((row) =>
    Object.entries(filters).every(([key, value]) => String(row[key]) === String(value))
  )
  const create = async (collection, body) => {
    const allowed = collection === COLLECTIONS.ratingScores
      ? new Set(['user_id', 'attribute_id', 'rating_id', 'attribute_score'])
      : new Set(['user_id', 'rating_id', 'bonus_attribute_id'])
    assert.ok(Object.keys(body).every((field) => allowed.has(field)), `unsupported ${collection} field`)
    const row = { id: nextId++, ...body }
    state[collection].push(row)
    return row
  }
  return { state, list, create }
}

test('live rating child writes use only Swagger-supported fields and natural identities', async () => {
  const provider = stateProvider()
  const rating = { id: 100, expected_score_count: 2, expected_bonus_count: 1 }
  const expectedScores = [
    { attribute_id: 4, attribute_score: 6 },
    { attribute_id: 5, attribute_score: 7 }
  ]

  await withProviderMocks({ list: provider.list, create: provider.create }, async () => {
    await __testables.ensureScoreChildren(rating, 'user-1', expectedScores)
    await __testables.ensureBonusChildren(rating, 'user-1', ['50'])

    assert.deepEqual(provider.state[COLLECTIONS.ratingScores].map(({ id, ...row }) => row), [
      { user_id: 'user-1', attribute_id: 4, rating_id: 100, attribute_score: 6 },
      { user_id: 'user-1', attribute_id: 5, rating_id: 100, attribute_score: 7 }
    ])
    assert.deepEqual(provider.state[COLLECTIONS.bonusRatingMappings].map(({ id, ...row }) => row), [
      { user_id: 'user-1', rating_id: 100, bonus_attribute_id: '50' }
    ])

    const reconciliation = await __testables.reconcileExpectedChildren(rating, 'user-1', expectedScores, ['50'])
    assert.equal(reconciliation.complete, true)
  })
})

test('partial child persistence resumes without duplicating existing rows', async () => {
  const provider = stateProvider()
  provider.state[COLLECTIONS.ratingScores].push({ id: 150, user_id: 'user-1', rating_id: 100, attribute_id: 4, attribute_score: 6 })
  const rating = { id: 100, expected_score_count: 2, expected_bonus_count: 0 }
  const expectedScores = [
    { attribute_id: 4, attribute_score: 6 },
    { attribute_id: 5, attribute_score: 7 }
  ]

  await withProviderMocks({ list: provider.list, create: provider.create }, async () => {
    await __testables.ensureScoreChildren(rating, 'user-1', expectedScores)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 2)
    assert.equal(provider.state[COLLECTIONS.ratingScores].filter((row) => String(row.attribute_id) === '4').length, 1)
    const reconciliation = await __testables.reconcileExpectedChildren(rating, 'user-1', expectedScores, [])
    assert.equal(reconciliation.complete, true)
  })
})

test('conflicting persisted child data fails closed', async () => {
  const provider = stateProvider()
  provider.state[COLLECTIONS.ratingScores].push({ id: 150, user_id: 'user-1', rating_id: 100, attribute_id: 4, attribute_score: 2 })

  await withProviderMocks({ list: provider.list, create: provider.create }, async () => {
    await assert.rejects(
      __testables.ensureScoreChildren({ id: 100 }, 'user-1', [{ attribute_id: 4, attribute_score: 6 }]),
      (error) => error.status === 409
    )
  })
})
