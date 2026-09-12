import assert from 'node:assert/strict'
import test from 'node:test'

import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../_lib/dataProvider.js'
import { __testables } from '../rating-data-proxy.js'

const attributes = [
  { id: 1, attribute_name: 'Design', is_scored: 0, weighting: 0 },
  { id: 2, attribute_name: 'Appearence', is_scored: 1, weighting: 0.1 },
  { id: 3, attribute_name: 'Aroma', is_scored: 1, weighting: 0.1 },
  { id: 4, attribute_name: 'Mouthfeel', is_scored: 1, weighting: 0.2 },
  { id: 5, attribute_name: 'Flavour', is_scored: 1, weighting: 0.25 },
  { id: 6, attribute_name: 'Follow', is_scored: 1, weighting: 0.25 },
  { id: 7, attribute_name: 'Bonus', is_scored: 1, weighting: 0.1 },
  { id: 8, attribute_name: 'Burp', is_scored: 0, weighting: 0 }
]

const maximumScores = [
  { attributeId: 2, score: 7 },
  { attributeId: 3, score: 7 },
  { attributeId: 4, score: 7 },
  { attributeId: 5, score: 7 },
  { attributeId: 6, score: 7 },
  { attributeId: 7, score: 0 },
  { attributeId: 1, score: 7 },
  { attributeId: 8, score: 1 }
]

const bonusAttributes = [
  { id: 50, description: 'Exceptional balance', point_value: 0.8 },
  { id: 51, description: 'Outstanding finish', point_value: 0.8 },
  { id: 52, description: 'Memorable character', point_value: 0.4 }
]

const maximumBonusIds = bonusAttributes.map(({ id }) => id)

const defaultWeights = {
  appearance: 0.1,
  aroma: 0.1,
  mouthfeel: 0.2,
  flavour: 0.25,
  follow: 0.25,
  bonus: 0.1
}

const responseHarness = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
  end() { return this }
})

const withProviderMocks = async (overrides, callback) => {
  const original = {}
  for (const [name, replacement] of Object.entries(overrides)) {
    original[name] = dataProvider[name]
    dataProvider[name] = replacement
  }
  try {
    await callback()
  } finally {
    for (const [name, value] of Object.entries(original)) dataProvider[name] = value
  }
}

const durableProvider = () => {
  const state = {
    [COLLECTIONS.ratings]: [],
    [COLLECTIONS.ratingScores]: [],
    [COLLECTIONS.bonusRatingMappings]: []
  }
  let nextId = 100
  const listState = (collection, filters = {}) => (state[collection] || []).filter((item) =>
    Object.entries(filters).every(([key, value]) => String(item[key]) === String(value))
  )

  return {
    state,
    mocks: {
      isUniqueConflict: (error) => error?.status === 409,
      get: async (collection, id) => {
        if (collection === COLLECTIONS.products && String(id) === '4') {
          return { id: 4, product_name: 'Ace', product_category_id: 10, producer_id: 20 }
        }
        if (collection === COLLECTIONS.cellar) return null
        return (state[collection] || []).find((item) => String(item.id) === String(id)) || null
      },
      list: async (collection, filters = {}) => {
        if (collection === COLLECTIONS.ratingAttributes) return attributes
        if (collection === COLLECTIONS.bonusAttributes) return bonusAttributes
        if (collection === COLLECTIONS.bonusAttributeCategories) return []
        if (collection === COLLECTIONS.bonusAttributeCategoryMappings) return []
        return listState(collection, filters)
      },
      create: async (collection, body) => {
        const uniqueField = collection === COLLECTIONS.ratings ? 'submission_key' : 'uniqueness_key'
        if ((state[collection] || []).some((item) => item[uniqueField] === body[uniqueField])) {
          throw Object.assign(new Error('conflict'), { status: 409 })
        }
        const record = { id: nextId++, ...body }
        state[collection].push(record)
        return record
      },
      compareAndSet: async (collection, id, expectedVersion, body) => {
        const record = state[collection].find((item) => String(item.id) === String(id))
        if (!record || Number(record.submission_version) !== expectedVersion) {
          throw Object.assign(new Error('conflict'), { status: 409, code: 'VERSION_CONFLICT' })
        }
        Object.assign(record, body)
        return record
      },
      remove: async (collection, id) => {
        const index = state[collection].findIndex((item) => String(item.id) === String(id))
        if (index >= 0) state[collection].splice(index, 1)
      }
    }
  }
}

const submitMaximum = async (response, weights = defaultWeights) => __testables.submitRating({
  body: {
    productId: 4,
    submissionId: 1700000000000001,
    total_weighted: 1,
    total_unweighted: 1,
    scores: maximumScores,
    weights,
    bonusAttributeIds: maximumBonusIds
  }
}, response, { id: 'user-1' }, 'test-request')

test('submitRating ignores browser totals and Bonus, persists server-derived five-point totals and replays idempotently', async () => {
  const provider = durableProvider()

  await withProviderMocks(provider.mocks, async () => {
    const firstResponse = responseHarness()
    await submitMaximum(firstResponse)

    assert.equal(firstResponse.statusCode, 201)
    assert.equal(firstResponse.body.rating.total_weighted, 5)
    assert.equal(firstResponse.body.rating.total_unweighted, 5)
    assert.equal(firstResponse.body.rating.advanced_scores.score_out_of_100, 100)
    assert.equal(firstResponse.body.bonusPointTotal, 2)
    assert.equal(firstResponse.body.bonusScore, 2)
    assert.equal(firstResponse.body.duplicate, false)

    const ratingWrite = provider.state[COLLECTIONS.ratings][0]
    assert.equal(ratingWrite.total_weighted, 5)
    assert.equal(ratingWrite.total_unweighted, 5)
    assert.equal(ratingWrite.submission_state, 'complete')
    assert.equal(ratingWrite.rating_id, 1700000000000001)
    assert.equal(Object.hasOwn(ratingWrite, 'weights'), false)
    assert.equal(Object.hasOwn(ratingWrite, 'score_out_of_100'), false)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)

    const retryResponse = responseHarness()
    await submitMaximum(retryResponse)
    assert.equal(retryResponse.statusCode, 200)
    assert.equal(retryResponse.body.duplicate, true)
    assert.equal(provider.state[COLLECTIONS.ratings].length, 1)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)
  })
})

test('a submission id cannot be replayed with different personalised weights', async () => {
  const provider = durableProvider()

  await withProviderMocks(provider.mocks, async () => {
    const firstResponse = responseHarness()
    await submitMaximum(firstResponse)
    assert.equal(firstResponse.statusCode, 201)

    const alteredWeights = { ...defaultWeights, appearance: 0.2, aroma: 0 }
    await assert.rejects(
      submitMaximum(responseHarness(), alteredWeights),
      (error) => error.status === 409
    )
    assert.equal(provider.state[COLLECTIONS.ratings].length, 1)
  })
})

test('owner history preserves exact category metadata, derives private PPP and hides incomplete ratings', async () => {
  await withProviderMocks({
    list: async (collection, filters = {}) => {
      if (collection === COLLECTIONS.ratings && filters.user_id === 'user-1') {
        return [
          { id: 99, user_id: 'user-1', product_id: 4, cellar_id: 55, date_rated: '2026-09-11T00:00:00.000Z', total_unweighted: 4, total_weighted: 4, submission_state: 'complete' },
          { id: 101, user_id: 'user-1', product_id: 4, cellar_id: 55, date_rated: '2026-09-12T00:00:00.000Z', total_unweighted: 5, total_weighted: 5, submission_state: 'pending' }
        ]
      }
      if (collection === COLLECTIONS.ratings) return [
        { id: 99, total_weighted: 4, submission_state: 'complete' },
        { id: 100, total_weighted: 5, submission_state: 'complete' },
        { id: 101, total_weighted: 5, submission_state: 'pending' }
      ]
      if (collection === COLLECTIONS.cellar) return [{ id: 55, user_id: 'user-1', product_id: 4, mls: 375, purchase_price: 8, retail_price: 10 }]
      return []
    },
    get: async (collection, id) => {
      if (collection === COLLECTIONS.products && String(id) === '4') return { id: 4, product_name: 'Ace', product_category_id: 10, producer_id: 20 }
      if (collection === COLLECTIONS.producers && String(id) === '20') return { id: 20, producer_name: 'Rocky Ridge Brewing' }
      if (collection === COLLECTIONS.categories && String(id) === '10') return { id: 10, category_name: 'Pale Ale' }
      return null
    }
  }, async () => {
    const response = responseHarness()
    await __testables.listUserRatings(response, { id: 'user-1' })

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.items.length, 1)
    const item = response.body.items[0]
    assert.equal(item.product.product_category_id, 10)
    assert.deepEqual(item.product.category, { id: 10, category_name: 'Pale Ale' })
    assert.deepEqual(item.product.producer, { id: 20, producer_name: 'Rocky Ridge Brewing' })
    assert.equal(item.advanced_scores.score_out_of_100, 80)
    assert.equal(item.advanced_scores.scaled_score, 0)
    assert.equal(item.advanced_scores.retail_ppp, 136.36)
    assert.equal(item.advanced_scores.purchased_ppp, 140.71)
  })
})

test('product projection refuses mismatched producer/category identities', async () => {
  await withProviderMocks({
    get: async (collection, id) => {
      if (collection === COLLECTIONS.products) return { id: 4, product_name: 'Ace', product_category_id: 10, producer_id: 20 }
      if (collection === COLLECTIONS.producers) return { id: 21, producer_name: 'Wrong Brewery' }
      if (collection === COLLECTIONS.categories) return { id: 11, category_name: 'Wrong Style' }
      return null
    }
  }, async () => {
    const projection = await __testables.productProjection('4')
    assert.equal(projection.producer, null)
    assert.equal(projection.category, null)
    assert.equal(projection.product_category_id, 10)
    assert.equal(projection.producer_id, 20)
  })
})
