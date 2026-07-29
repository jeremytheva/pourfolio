import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../[...path].js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const user = { id: 'user-a' }
const body = {
  productId: 10,
  submissionId: 99,
  scores: [{ attributeId: 2, score: 6 }, { attributeId: 3, score: 4 }],
  bonusAttributeIds: [7]
}
const response = () => ({ statusCode: null, body: null, status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } })

const installMemoryProvider = ({ cellar, failCreate, failGet, failList, failUpdate } = {}) => {
  const records = {
    [COLLECTIONS.ratings]: [],
    [COLLECTIONS.ratingScores]: [],
    [COLLECTIONS.bonusRatingMappings]: []
  }
  let nextId = 1
  dataProvider.isUniqueConflict = (error) => error?.status === 409
  dataProvider.get = async (collection, id) => {
    if (failGet?.(collection, id, records)) throw Object.assign(new Error('get failure'), { status: 502 })
    if (collection === COLLECTIONS.products) return { id, product_name: 'Safe Ale' }
    if (collection === COLLECTIONS.cellar) return cellar || null
    return records[collection]?.find((item) => String(item.id) === String(id)) || null
  }
  dataProvider.list = async (collection, filters = {}) => {
    if (failList?.(collection, filters, records)) throw Object.assign(new Error('list failure'), { status: 502 })
    if (collection === COLLECTIONS.ratingAttributes) return [
      { id: 2, is_scored: 1, weighting: 1 }, { id: 3, is_scored: 1, weighting: 1 }
    ]
    if (collection === COLLECTIONS.bonusAttributes) return [{ id: 7 }]
    return (records[collection] || []).filter((item) => Object.entries(filters).every(([key, value]) => String(item[key]) === String(value)))
  }
  dataProvider.create = async (collection, value) => {
    if (failCreate?.(collection, value, records)) throw Object.assign(new Error('upstream failure'), { status: 502 })
    const uniqueField = collection === COLLECTIONS.ratings ? 'submission_key' : 'uniqueness_key'
    if (records[collection].some((item) => item[uniqueField] === value[uniqueField])) {
      throw Object.assign(new Error('conflict'), { status: 409 })
    }
    const item = { id: nextId++, ...value }
    records[collection].push(item)
    return item
  }
  dataProvider.update = async (collection, id, value) => {
    if (failUpdate?.(collection, id, value)) throw Object.assign(new Error('update failure'), { status: 502 })
    const item = records[collection].find((candidate) => candidate.id === id)
    Object.assign(item, value)
    return item
  }
  return records
}

const submit = async (overrides = {}, actor = user) => {
  const result = response()
  await __testables.submitRating({ body: { ...body, ...overrides } }, result, actor, 'test-request')
  return result
}

test('concurrent duplicate requests converge on one complete owner submission', async () => {
  const records = installMemoryProvider()
  const [first, second] = await Promise.all([submit(), submit()])
  assert.deepEqual([first.statusCode, second.statusCode].sort(), [200, 201])
  assert.equal(records.ratings.length, 1)
  assert.equal(records.rating_scores.length, 2)
  assert.equal(records.bonus_attribute_rating_mapping.length, 1)
  assert.equal(records.ratings[0].submission_state, 'complete')
})

test('a timeout after the header write is recovered by an idempotent retry', async () => {
  let timedOut = false
  const records = installMemoryProvider({ failCreate(collection, value, state) {
    if (collection === COLLECTIONS.ratings && !timedOut) {
      timedOut = true
      state[collection].push({ id: 1, ...value })
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' })
    }
    return false
  } })
  const result = await submit()
  assert.equal(result.statusCode, 200)
  assert.equal(records.ratings[0].submission_state, 'complete')
})

test('partial child creation is failed and retry reconciliation completes it', async () => {
  let failOnce = true
  const records = installMemoryProvider({ failCreate(collection) {
    if (collection === COLLECTIONS.ratingScores && failOnce) { failOnce = false; return true }
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  assert.equal(records.ratings[0].submission_state, 'failed')
  const retried = await submit()
  assert.equal(retried.statusCode, 200)
  assert.equal(records.ratings[0].submission_state, 'complete')
})

test('a failure after a persisted score write is reconciled without duplicate children', async () => {
  let failOnce = true
  const records = installMemoryProvider({ failCreate(collection, value, state) {
    if (collection === COLLECTIONS.ratingScores && failOnce) {
      failOnce = false
      state[collection].push({ id: 20, ...value })
      throw Object.assign(new Error('post-write timeout'), { name: 'TimeoutError' })
    }
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  const retried = await submit()
  assert.equal(retried.statusCode, 200)
  assert.equal(records.rating_scores.length, 2)
  assert.equal(records.bonus_attribute_rating_mapping.length, 1)
  assert.equal(records.ratings[0].submission_state, 'complete')
})

test('a failure after a persisted bonus write is reconciled without duplicate children', async () => {
  let failOnce = true
  const records = installMemoryProvider({ failCreate(collection, value, state) {
    if (collection === COLLECTIONS.bonusRatingMappings && failOnce) {
      failOnce = false
      state[collection].push({ id: 20, ...value })
      throw Object.assign(new Error('post-write timeout'), { name: 'TimeoutError' })
    }
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  const retried = await submit()
  assert.equal(retried.statusCode, 200)
  assert.equal(records.rating_scores.length, 2)
  assert.equal(records.bonus_attribute_rating_mapping.length, 1)
})

test('a verification re-read failure never reports success and can be retried', async () => {
  let scoreReads = 0
  const records = installMemoryProvider({ failList(collection, filters) {
    if (collection === COLLECTIONS.ratingScores && filters.rating_id && ++scoreReads === 2) return true
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  assert.equal(records.ratings[0].submission_state, 'failed')
  const retried = await submit()
  assert.equal(retried.statusCode, 200)
  assert.equal(records.ratings[0].submission_state, 'complete')
})

test('a post-write workflow-state timeout never reports success and retry confirms completion', async () => {
  let failOnce = true
  const records = installMemoryProvider({ failUpdate(collection, id, value) {
    if (collection === COLLECTIONS.ratings && value.submission_state === 'complete' && failOnce) {
      failOnce = false
      const rating = records.ratings.find((item) => item.id === id)
      rating.submission_state = 'complete'
      throw Object.assign(new Error('post-write timeout'), { name: 'TimeoutError' })
    }
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  assert.equal(records.ratings[0].submission_state, 'failed')
  const retried = await submit()
  assert.equal(retried.statusCode, 200)
  assert.equal(records.ratings[0].submission_state, 'complete')
})

test('success requires a durable complete workflow-state re-read', async () => {
  let ignoreComplete = true
  const records = installMemoryProvider({ failUpdate(collection, id, value) {
    if (collection === COLLECTIONS.ratings && value.submission_state === 'complete' && ignoreComplete) {
      ignoreComplete = false
      return true
    }
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  assert.equal(records.ratings[0].submission_state, 'failed')
  const retried = await submit()
  assert.equal(retried.statusCode, 200)
})

test('verification rejects a child whose deterministic key hides corrupt score data', async () => {
  let corruptOnce = true
  const records = installMemoryProvider({ failList(collection, filters, state) {
    if (collection === COLLECTIONS.ratingScores && filters.rating_id && state.rating_scores.length === 2 && corruptOnce) {
      corruptOnce = false
      state.rating_scores[0].attribute_score = 1
    }
    return false
  } })
  await assert.rejects(submit(), /incomplete/)
  assert.equal(records.ratings[0].submission_state, 'failed')
})

test('child uniqueness conflicts are accepted only after owner-scoped validation', async () => {
  const records = installMemoryProvider()
  const initial = await submit()
  assert.equal(initial.statusCode, 201)
  records.ratings[0].submission_state = 'failed'
  const originalList = dataProvider.list
  let hidConcurrentScores = false
  dataProvider.list = async (collection, filters) => {
    if (collection === COLLECTIONS.ratingScores && filters.rating_id && !hidConcurrentScores) {
      hidConcurrentScores = true
      return []
    }
    return originalList(collection, filters)
  }
  const retry = await submit()
  assert.equal(retry.statusCode, 200)
  assert.equal(retry.body.duplicate, true)
})

test('a duplicate is not successful while expected children remain incomplete', async () => {
  let alwaysFail = false
  const records = installMemoryProvider({ failCreate(collection) {
    return alwaysFail && collection === COLLECTIONS.bonusRatingMappings
  } })
  await submit()
  records.bonus_attribute_rating_mapping.length = 0
  records.ratings[0].submission_state = 'pending'
  alwaysFail = true
  await assert.rejects(submit(), /incomplete/)
  assert.equal(records.ratings[0].submission_state, 'failed')
})

test('reconciliation reports safely when recording failed state also fails', async () => {
  installMemoryProvider({
    failCreate: (collection) => collection === COLLECTIONS.ratingScores,
    failUpdate: (collection, id, value) => collection === COLLECTIONS.ratings && value.submission_state === 'failed'
  })
  await assert.rejects(submit(), /incomplete and can be retried safely/)
})

test('a rating cannot attach another user cellar record', async () => {
  installMemoryProvider({ cellar: { id: 12, user_id: 'user-b', product_id: 10 } })
  await assert.rejects(submit({ cellarId: 12 }), (error) => error.status === 403)
})
