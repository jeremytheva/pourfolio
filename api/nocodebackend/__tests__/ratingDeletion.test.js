import test from 'node:test'
import assert from 'node:assert/strict'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../data-proxy.js'
import { COLLECTIONS } from '../../../src/data/contract.js'

const user = { id: 'owner-a' }
const original = Object.fromEntries(Object.keys(dataProvider).map((key) => [key, dataProvider[key]]))
const response = () => ({
  statusCode: null,
  status(code) { this.statusCode = code; return this },
  end() { this.ended = true; return this },
  json(value) { this.body = value; return this }
})

const installProvider = ({ failRemovalAt = 0, childOwner = user.id } = {}) => {
  const records = {
    [COLLECTIONS.ratings]: [{ id: 1, user_id: user.id, submission_state: 'complete', submission_version: 4 }],
    [COLLECTIONS.ratingScores]: [
      { id: 11, rating_id: 1, user_id: childOwner },
      { id: 12, rating_id: 1, user_id: user.id }
    ],
    [COLLECTIONS.bonusRatingMappings]: [
      { id: 21, rating_id: 1, user_id: user.id },
      { id: 22, rating_id: 1, user_id: user.id }
    ]
  }
  let removalCount = 0
  dataProvider.get = async (collection, id) => records[collection].find((item) => String(item.id) === String(id)) || null
  dataProvider.list = async (collection, filters = {}) => records[collection].filter((item) =>
    Object.entries(filters).every(([key, value]) => String(item[key]) === String(value)))
  dataProvider.compareAndSet = async (collection, id, expectedVersion, updates) => {
    const item = records[collection].find((entry) => String(entry.id) === String(id))
    if (Number(item.submission_version) !== expectedVersion) throw Object.assign(new Error('stale'), { code: 'VERSION_CONFLICT' })
    Object.assign(item, updates)
    return item
  }
  dataProvider.remove = async (collection, id) => {
    removalCount += 1
    if (removalCount === failRemovalAt) throw new Error('injected child failure')
    const index = records[collection].findIndex((item) => String(item.id) === String(id))
    if (index < 0) throw Object.assign(new Error('missing'), { status: 404 })
    records[collection].splice(index, 1)
  }
  return records
}

test.afterEach(() => Object.assign(dataProvider, original))

for (const failurePoint of [1, 2, 3, 4]) {
  test(`deletion reconciles after failure at child deletion ${failurePoint}`, async () => {
    const records = installProvider({ failRemovalAt: failurePoint })
    await assert.rejects(__testables.deleteRating('1', response(), user), /injected child failure/)
    assert.equal(records.ratings[0].submission_state, 'deleting')
    await __testables.deleteRating('1', response(), user)
    assert.equal(records.ratings[0].submission_state, 'deleted')
    assert.equal(records.rating_scores.length + records.bonus_attribute_rating_mapping.length, 0)
  })
}

test('repeated and concurrent deletion are idempotent', async () => {
  const records = installProvider()
  const first = response(); const second = response()
  await Promise.all([__testables.deleteRating('1', first, user), __testables.deleteRating('1', second, user)])
  await __testables.deleteRating('1', response(), user)
  assert.equal(first.statusCode, 204)
  assert.equal(second.statusCode, 204)
  assert.equal(records.ratings[0].submission_state, 'deleted')
  assert.equal(records.ratings[0].submission_version, 6)
})

test('forged parent ownership cannot start deletion', async () => {
  const records = installProvider()
  records.ratings[0].user_id = 'owner-b'
  const denied = response()
  await __testables.deleteRating('1', denied, user)
  assert.equal(denied.statusCode, 403)
  assert.equal(records.ratings[0].submission_state, 'complete')
  assert.equal(records.rating_scores.length, 2)
})

test('child cleanup is owner and parent scoped', async () => {
  const records = installProvider({ childOwner: 'owner-b' })
  await __testables.deleteRating('1', response(), user)
  assert.deepEqual(records.rating_scores.map(({ id, user_id }) => ({ id, user_id })), [{ id: 11, user_id: 'owner-b' }])
  assert.equal(records.ratings[0].submission_state, 'deleted')
})

test('deleting and deleted ratings are excluded from every read predicate', async () => {
  const hidden = [
    { user_id: user.id, submission_state: 'deleting', date_rated: '2025-01-01', product_id: 1 },
    { user_id: user.id, submission_state: 'deleted', date_rated: '2025-01-01', product_id: 1 }
  ]
  for (const rating of hidden) {
    assert.equal(__testables.activeRatingMatches(rating, user.id, Date.now(), { id: 1 }, 'both_rated_product'), false)
  }
})
