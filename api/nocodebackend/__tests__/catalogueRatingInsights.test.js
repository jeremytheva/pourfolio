import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../catalog-data-proxy.js'

const original = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, original))

const complete = (id) => ({ id, submission_state: 'complete', total_weighted: 3 })
const score = (id, ratingId, value = 4) => ({ id, rating_id: ratingId, attribute_id: 2, attribute_score: value })
const installAttributes = () => {
  dataProvider.list = async (collection) => collection === COLLECTIONS.ratingAttributes
    ? [{ id: 2, attribute_name: 'Appearance' }]
    : [score(1, 1, 6)] // A legacy unpaged read omits the newer tasting.
}

test('product attribute averages include late-page scores and exclude unrelated provider rows', async () => {
  installAttributes()
  const rows = [score(1, 1, 6), ...Array.from({ length: 99 }, (_, i) => score(i + 2, 9000 + i, 7)), score(101, 629)]
  const pages = []
  dataProvider.listPage = async (collection, { page, limit, filters }) => {
    assert.equal(collection, COLLECTIONS.ratingScores)
    assert.deepEqual(filters, { 'rating_id[in]': '1,629' })
    pages.push(page)
    return { items: rows.slice((page - 1) * limit, page * limit), totalPages: 2 }
  }

  const result = await __testables.buildRatingInsights([complete(1), complete(629)])
  assert.deepEqual(pages, [1, 2])
  assert.deepEqual(result.attributes, [{ attributeId: '2', name: 'Appearance', average: 5, count: 2 }])
  assert.equal(result.distribution.reduce((sum, bucket) => sum + bucket.count, 0), 2)
})

test('product score reads bound each ID batch and do not count broad provider responses twice', async () => {
  installAttributes()
  const ratings = Array.from({ length: 76 }, (_, i) => complete(i + 1))
  const batches = []
  dataProvider.listPage = async (collection, { filters }) => {
    assert.equal(collection, COLLECTIONS.ratingScores)
    batches.push(filters['rating_id[in]'].split(','))
    return { items: ratings.map(({ id }) => score(id, id)), totalPages: 1 }
  }

  const result = await __testables.buildRatingInsights(ratings)
  assert.deepEqual(batches.map((ids) => ids.length), [75, 1])
  assert.deepEqual(result.attributes, [{ attributeId: '2', name: 'Appearance', average: 4, count: 76 }])
})

test('an unavailable later score page does not publish partial attribute averages', async () => {
  installAttributes()
  dataProvider.listPage = async (collection, { page }) => {
    assert.equal(collection, COLLECTIONS.ratingScores)
    if (page === 2) throw new Error('Later score page unavailable')
    return { items: [score(1, 1, 6)], totalPages: 2 }
  }
  await assert.rejects(__testables.buildRatingInsights([complete(1)]), /Later score page unavailable/)
})

test('incomplete and tombstoned ratings never trigger score reads or enter insight counts', async () => {
  dataProvider.list = async () => { throw new Error('Unexpected list') }
  dataProvider.listPage = async () => { throw new Error('Unexpected page') }
  const result = await __testables.buildRatingInsights([
    { ...complete(1), submission_state: 'pending' },
    { ...complete(2), deleted_at: '2026-10-19 09:00:00' }
  ])
  assert.deepEqual(result.attributes, [])
  assert.equal(result.distribution.reduce((sum, bucket) => sum + bucket.count, 0), 0)
})
