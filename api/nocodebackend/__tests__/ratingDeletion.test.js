import test from 'node:test'
import assert from 'node:assert/strict'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../rating-data-proxy.js'
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
  dataProvider.get = async (collection, id) => structuredClone(records[collection].find((item) => String(item.id) === String(id)) || null)
  dataProvider.list = async (collection, filters = {}) => records[collection].filter((item) =>
    Object.entries(filters).every(([key, value]) => String(item[key]) === String(value)))
  dataProvider.listPage = async (collection, { filters, page, limit }) => {
    assert.deepEqual(Object.keys(filters), ['rating_id'], 'avoid unsupported compound child filters')
    const rows = await dataProvider.list(collection, filters)
    return { items: structuredClone(rows.slice((page - 1) * limit, page * limit)), totalPages: Math.ceil(rows.length / limit) }
  }
  dataProvider.update = async (collection, id, updates) => {
    const item = records[collection].find((entry) => String(entry.id) === String(id))
    if (!item) throw Object.assign(new Error('missing'), { status: 404 })
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
  await assert.rejects(__testables.deleteRating('1', response(), user), (error) => error.code === 'RATING_CHILD_OWNERSHIP_CONFLICT')
  assert.equal(records.rating_scores.length, 2)
  assert.equal(records.bonus_attribute_rating_mapping.length, 2)
  assert.equal(records.ratings[0].submission_state, 'deleting')
})

test('delayed provider state reads are verified before deleting children', async () => {
  const records = installProvider()
  const get = dataProvider.get
  let staleReads = 0
  let stale = null
  const update = dataProvider.update
  dataProvider.update = async (collection, id, values) => {
    stale = await get(collection, id)
    staleReads = 2
    return update(collection, id, values)
  }
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.ratings && staleReads-- > 0) return structuredClone(stale)
    return get(collection, id)
  }
  const result = response()
  await __testables.deleteRating('1', result, user)
  assert.equal(result.statusCode, 204)
  assert.equal(records.ratings[0].submission_state, 'deleted')
  assert.equal(records.rating_scores.length + records.bonus_attribute_rating_mapping.length, 0)
})

test('an acknowledged but unpersisted transition cannot delete children', async () => {
  const records = installProvider()
  dataProvider.update = async () => ({ id: 1, submission_state: 'deleting', submission_version: 5 })
  await assert.rejects(__testables.deleteRating('1', response(), user), (error) => error.status === 503 && error.code === 'RATING_DELETE_VERIFICATION_PENDING')
  assert.equal(records.ratings[0].submission_state, 'complete')
  assert.equal(records.rating_scores.length, 2)
  assert.equal(records.bonus_attribute_rating_mapping.length, 2)
})

test('cleanup reads every child page and leaves unrelated ratings untouched', async () => {
  const records = installProvider()
  records.rating_scores = Array.from({ length: 205 }, (_, index) => ({ id: index + 100, rating_id: 1, user_id: user.id }))
  records.rating_scores.push({ id: 999, rating_id: 2, user_id: user.id })
  await __testables.deleteRating('1', response(), user)
  assert.deepEqual(records.rating_scores, [{ id: 999, rating_id: 2, user_id: user.id }])
  assert.equal(records.ratings[0].submission_state, 'deleted')
})

for (const missing of [undefined, null, '']) {
  test(`unmanaged historical deletion uses existing CRUD only with version ${String(missing)}`, async () => {
    const records = installProvider({ failRemovalAt: 2 })
    records.ratings[0].submission_version = missing
    dataProvider.update = async () => assert.fail('Historical deletion must not fabricate lifecycle fields')
    await assert.rejects(__testables.deleteRating('1', response(), user), /injected child failure/)
    assert.equal(records.ratings.length, 1)
    assert.equal(records.ratings[0].submission_state, 'complete')
    const retry = response()
    await __testables.deleteRating('1', retry, user)
    assert.equal(retry.statusCode, 204)
    assert.equal(records.ratings.length + records.rating_scores.length + records.bonus_attribute_rating_mapping.length, 0)
    const repeated = response()
    await __testables.deleteRating('1', repeated, user)
    assert.equal(repeated.statusCode, 204)
  })
}

test('a managed submission with a missing version cannot fall back to physical deletion', async () => {
  for (const state of ['complete', 'deleting', 'deleted']) {
    const records = installProvider()
    Object.assign(records.ratings[0], { submission_key: 'managed-key', submission_version: null, submission_state: state })
    await assert.rejects(__testables.deleteRating('1', response(), user), (error) => error.code === 'RATING_DELETE_WORKFLOW_UNAVAILABLE')
    assert.equal(records.ratings.length, 1)
    assert.equal(records.rating_scores.length, 2)
  }
})

test('historical header changes during cleanup prevent header deletion', async () => {
  const records = installProvider()
  delete records.ratings[0].submission_version
  const remove = dataProvider.remove
  dataProvider.remove = async (collection, id) => {
    await remove(collection, id)
    if (collection !== COLLECTIONS.ratings) records.ratings[0].submission_version = 1
  }
  await assert.rejects(__testables.deleteRating('1', response(), user), (error) => error.code === 'RATING_DELETE_CONFLICT')
  assert.equal(records.ratings.length, 1)
})

