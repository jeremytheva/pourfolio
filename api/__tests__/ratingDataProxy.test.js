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
        const duplicate = collection === COLLECTIONS.ratings
          ? (state[collection] || []).some((item) => item.submission_key === body.submission_key)
          : collection === COLLECTIONS.ratingScores
            ? (state[collection] || []).some((item) => String(item.rating_id) === String(body.rating_id) && String(item.attribute_id) === String(body.attribute_id))
            : (state[collection] || []).some((item) => String(item.rating_id) === String(body.rating_id) && String(item.bonus_attribute_id) === String(body.bonus_attribute_id))
        if (duplicate) throw Object.assign(new Error('conflict'), { status: 409, code: 'UNIQUE_CONFLICT' })
        const record = { id: nextId++, ...body }
        state[collection].push(record)
        return record
      },
      update: async (collection, id, body) => {
        const record = state[collection].find((item) => String(item.id) === String(id))
        if (!record) throw Object.assign(new Error('not found'), { status: 404 })
        Object.assign(record, body)
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
    assert.equal(ratingWrite.id, 100)
    assert.equal(ratingWrite.total_weighted, 5)
    assert.equal(ratingWrite.total_unweighted, 5)
    assert.equal(ratingWrite.submission_state, 'complete')
    assert.equal(Object.hasOwn(ratingWrite, 'rating_id'), false)
    assert.equal(typeof ratingWrite.submission_key, 'string')
    assert.ok(ratingWrite.submission_key.length > 0)
    assert.equal(Object.hasOwn(ratingWrite, 'weights'), false)
    assert.equal(Object.hasOwn(ratingWrite, 'score_out_of_100'), false)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.ok(provider.state[COLLECTIONS.ratingScores].every((score) => String(score.rating_id) === String(ratingWrite.id)))
    assert.ok(provider.state[COLLECTIONS.ratingScores].every((score) => !Object.hasOwn(score, 'uniqueness_key')))
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)
    assert.ok(provider.state[COLLECTIONS.bonusRatingMappings].every((mapping) => String(mapping.rating_id) === String(ratingWrite.id)))
    assert.ok(provider.state[COLLECTIONS.bonusRatingMappings].every((mapping) => Object.hasOwn(mapping, 'bonus_attribute_id') && !Object.hasOwn(mapping, 'bonus_attributes_id') && !Object.hasOwn(mapping, 'uniqueness_key')))

    const retryResponse = responseHarness()
    await submitMaximum(retryResponse)
    assert.equal(retryResponse.statusCode, 200)
    assert.equal(retryResponse.body.duplicate, true)
    assert.equal(provider.state[COLLECTIONS.ratings].length, 1)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)
  })
})

test('fresh submission completes from individually verified children when child collection reads stay empty', async () => {
  const provider = durableProvider()
  const baseList = provider.mocks.list
  provider.mocks.list = async (collection, filters = {}) => {
    if (collection === COLLECTIONS.ratingScores || collection === COLLECTIONS.bonusRatingMappings) return []
    return baseList(collection, filters)
  }

  await withProviderMocks(provider.mocks, async () => {
    const response = responseHarness()
    await submitMaximum(response)

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.duplicate, false)
    assert.equal(provider.state[COLLECTIONS.ratings][0].submission_state, 'complete')
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)
  })
})

test('completed duplicate replay does not depend on child collection rediscovery', async () => {
  const provider = durableProvider()

  await withProviderMocks(provider.mocks, async () => {
    const firstResponse = responseHarness()
    await submitMaximum(firstResponse)
    assert.equal(firstResponse.statusCode, 201)

    const baseList = provider.mocks.list
    dataProvider.list = async (collection, filters = {}) => {
      if (collection === COLLECTIONS.ratingScores || collection === COLLECTIONS.bonusRatingMappings) return []
      return baseList(collection, filters)
    }

    const retryResponse = responseHarness()
    await submitMaximum(retryResponse)

    assert.equal(retryResponse.statusCode, 200)
    assert.equal(retryResponse.body.duplicate, true)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)
  })
})

test('rating state transition tolerates a stale first read after provider update', async () => {
  const persisted = {
    id: 100,
    user_id: 'user-1',
    submission_fingerprint: 'fingerprint',
    submission_state: 'pending',
    submission_version: 0
  }
  let updated = false
  let postUpdateReads = 0

  await withProviderMocks({
    get: async () => {
      if (!updated) return { ...persisted }
      postUpdateReads += 1
      if (postUpdateReads === 1) return { ...persisted }
      return { ...persisted, submission_state: 'complete', submission_version: 1 }
    },
    update: async () => {
      updated = true
      return { ...persisted, submission_state: 'complete', submission_version: 1 }
    }
  }, async () => {
    const result = await __testables.transitionRating(
      persisted,
      'user-1',
      'fingerprint',
      new Set(['pending']),
      'complete'
    )
    assert.equal(result.submission_state, 'complete')
    assert.equal(result.submission_version, 1)
    assert.equal(postUpdateReads, 2)
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


test('reconciliation accepts provider DECIMAL formatting and only skips matching score children', async () => {
  await withProviderMocks({
    list: async (collection) => {
      if (collection === COLLECTIONS.ratingScores) {
        return [{ id: 1, user_id: 'user-1', rating_id: 100, attribute_id: 5, attribute_score: '6.00' }]
      }
      if (collection === COLLECTIONS.bonusRatingMappings) return []
      return []
    }
  }, async () => {
    const result = await __testables.validateSubmissionChildren(
      { id: 100 },
      'user-1',
      [{ attribute_id: 5, attribute_score: 6 }],
      []
    )
    assert.equal(result.complete, true)
    assert.equal(result.scoreAttributes.has('5'), true)
  })

  await withProviderMocks({
    list: async (collection) => {
      if (collection === COLLECTIONS.ratingScores) {
        return [{ id: 1, user_id: 'user-1', rating_id: 100, attribute_id: 5, attribute_score: '5.00' }]
      }
      if (collection === COLLECTIONS.bonusRatingMappings) return []
      return []
    }
  }, async () => {
    const result = await __testables.validateSubmissionChildren(
      { id: 100 },
      'user-1',
      [{ attribute_id: 5, attribute_score: 6 }],
      []
    )
    assert.equal(result.complete, false)
    assert.equal(result.scoreAttributes.has('5'), false)
  })
})


test('valid partial-dimension tasting completes with only elected score rows plus server Bonus', async () => {
  const provider = durableProvider()
  await withProviderMocks(provider.mocks, async () => {
    const response = responseHarness()
    await __testables.submitRating({
      body: {
        productId: 4,
        submissionId: 1700000000000002,
        scores: [
          { attributeId: 4, score: 6 },
          { attributeId: 5, score: 6 },
          { attributeId: 6, score: 6 }
        ],
        weights: { appearance: 0, aroma: 0, mouthfeel: 0.3, flavour: 0.3, follow: 0.3, bonus: 0.1 },
        bonusAttributeIds: []
      }
    }, response, { id: 'user-1' }, 'partial-request')

    assert.equal(response.statusCode, 201)
    const rating = provider.state[COLLECTIONS.ratings][0]
    assert.equal(rating.submission_state, 'complete')
    assert.equal(rating.expected_score_count, 4)
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 4)
    assert.deepEqual(
      new Set(provider.state[COLLECTIONS.ratingScores].map((score) => Number(score.attribute_id))),
      new Set([4, 5, 6, 7])
    )
  })
})


test('historical reconciliation is dry-run by default and rejects structurally incomplete ratings', async () => {
  const updates = []
  await withProviderMocks({
    list: async (collection) => {
      if (collection === COLLECTIONS.ratings) return [
        { id: 10, user_id: 'user-1', product_id: 4, submission_state: 'pending', submission_version: 0 },
        { id: 11, user_id: 'user-1', product_id: 4, submission_state: 'pending', submission_version: 0 }
      ]
      if (collection === COLLECTIONS.ratingScores) {
        return [{ id: 20, user_id: 'user-1', rating_id: 10, attribute_id: 5, attribute_score: '6.00' }]
      }
      if (collection === COLLECTIONS.bonusRatingMappings) return []
      return []
    },
    update: async (...args) => { updates.push(args) }
  }, async () => {
    const response = responseHarness()
    await __testables.reconcileHistoricalRatings({ body: {} }, response, { id: 'user-1' })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.dryRun, true)
    assert.equal(response.body.examined, 2)
    assert.equal(response.body.eligible, 1)
    assert.equal(response.body.items.find((item) => item.ratingId === 10).structurallyValid, true)
    assert.equal(response.body.items.find((item) => item.ratingId === 11).structurallyValid, false)
    assert.equal(updates.length, 0)
  })
})


test('historical reconciliation never promotes or rewrites modern workflow submissions', async () => {
  const ratings = [
    {
      id: 12,
      user_id: 'user-1',
      product_id: 4,
      submission_state: 'failed',
      submission_version: 1,
      submission_key: 'user-1:1700000000000012',
      submission_fingerprint: 'modern-failed'
    },
    {
      id: 13,
      user_id: 'user-1',
      product_id: 4,
      submission_state: 'complete',
      submission_version: 1,
      submission_key: 'user-1:1700000000000013',
      submission_fingerprint: 'modern-complete'
    }
  ]
  const updates = []
  await withProviderMocks({
    list: async (collection, filters) => {
      if (collection === COLLECTIONS.ratings) return ratings
      if (collection === COLLECTIONS.ratingScores) {
        return [{ id: 30, user_id: 'user-1', rating_id: filters.rating_id, attribute_id: 5, attribute_score: '6.00' }]
      }
      if (collection === COLLECTIONS.bonusRatingMappings) return []
      return []
    },
    update: async (...args) => { updates.push(args) }
  }, async () => {
    const response = responseHarness()
    await __testables.reconcileHistoricalRatings({ body: { apply: true } }, response, { id: 'user-1' })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.eligible, 0)
    assert.equal(response.body.items.every((item) => item.legacyCandidate === false), true)
    assert.equal(response.body.items.every((item) => item.structurallyValid === false), true)
    assert.equal(updates.length, 0)
    assert.equal(ratings[0].submission_state, 'failed')
    assert.equal(ratings[1].submission_key, 'user-1:1700000000000013')
  })
})

test('diagnostic rating creation route is unavailable outside Vercel Preview', async () => {
  const previous = process.env.VERCEL_ENV
  process.env.VERCEL_ENV = 'production'
  try {
    const response = responseHarness()
    await __testables.routeRatingRequest(
      { method: 'POST', query: { path: ['ratings', 'create-diagnostic'] }, body: {} },
      response,
      { id: 'user-1' },
      'diagnostic-production'
    )
    assert.equal(response.statusCode, 404)
    assert.deepEqual(response.body, { error: 'Application data route not found.' })
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previous
  }
})


test('parent create acknowledgement is hydrated before child persistence', async () => {
  const provider = durableProvider()
  const baseCreate = provider.mocks.create
  provider.mocks.create = async (collection, body) => {
    const created = await baseCreate(collection, body)
    if (collection === COLLECTIONS.ratings) {
      return { status: 'success', message: 'Record created successfully', id: created.id }
    }
    return created
  }

  await withProviderMocks(provider.mocks, async () => {
    const response = responseHarness()
    await submitMaximum(response)
    assert.equal(response.statusCode, 201)
    assert.equal(provider.state[COLLECTIONS.ratings][0].submission_state, 'complete')
    assert.equal(provider.state[COLLECTIONS.ratingScores].length, 8)
    assert.equal(provider.state[COLLECTIONS.bonusRatingMappings].length, 3)
  })
})


test('historical reconciliation apply updates only structurally valid ratings and verifies persistence', async () => {
  const ratings = [
    { id: 10, user_id: 'user-1', product_id: 4, submission_state: 'pending', submission_version: 0 },
    { id: 11, user_id: 'user-1', product_id: 4, submission_state: 'pending', submission_version: 0 }
  ]
  const updates = []
  await withProviderMocks({
    list: async (collection) => {
      if (collection === COLLECTIONS.ratings) return ratings
      if (collection === COLLECTIONS.ratingScores) {
        return [{ id: 20, user_id: 'user-1', rating_id: 10, attribute_id: 5, attribute_score: '6.00' }]
      }
      if (collection === COLLECTIONS.bonusRatingMappings) return []
      return []
    },
    get: async (collection, id) => collection === COLLECTIONS.ratings
      ? ratings.find((rating) => String(rating.id) === String(id)) || null
      : null,
    update: async (collection, id, body) => {
      assert.equal(collection, COLLECTIONS.ratings)
      const rating = ratings.find((item) => String(item.id) === String(id))
      Object.assign(rating, body)
      updates.push({ id, body })
      return rating
    }
  }, async () => {
    const response = responseHarness()
    await __testables.reconcileHistoricalRatings({ body: { apply: true } }, response, { id: 'user-1' })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.dryRun, false)
    assert.equal(response.body.eligible, 1)
    assert.equal(updates.length, 1)
    assert.equal(updates[0].id, 10)
    assert.equal(ratings[0].submission_state, 'complete')
    assert.equal(ratings[0].expected_score_count, 1)
    assert.equal(ratings[0].expected_bonus_count, 0)
    assert.equal(ratings[0].submission_version, 1)
    assert.equal(ratings[1].submission_state, 'pending')
  })
})


test('rating parent create omits an absent cellar relationship instead of sending null', async () => {
  const provider = durableProvider()
  const baseCreate = provider.mocks.create
  let parentPayload
  provider.mocks.create = async (collection, body) => {
    if (collection === COLLECTIONS.ratings) parentPayload = body
    return baseCreate(collection, body)
  }

  await withProviderMocks(provider.mocks, async () => {
    const response = responseHarness()
    await submitMaximum(response)
    assert.equal(response.statusCode, 201)
    assert.ok(parentPayload)
    assert.equal(Object.hasOwn(parentPayload, 'cellar_id'), false)
  })
})
