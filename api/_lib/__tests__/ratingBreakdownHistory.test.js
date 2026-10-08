import assert from 'node:assert/strict'
import test from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../dataProvider.js'
import { loadRatingBreakdown } from '../ratingBreakdown.js'
import { loadPublicRatingHistory } from '../publicProfileHistory.js'
import { loadSharedProductRatings } from '../sharedProductRatings.js'
import { __testables } from '../../rating-data-proxy.js'
import { routeProfileRequest } from '../../profile-data-proxy.js'

const original = { ...dataProvider }
test.afterEach(() => Object.assign(dataProvider, original))
const owner = 'owner-a'
const publicId = 'profile_abcdefgh1234'
const rating = (id = 1, user_id = owner) => ({ id, user_id, product_id: 4,
  submission_state: 'complete', date_rated: new Date(Date.UTC(2026, 0, id)).toISOString(), total_weighted: 4 })
const profile = (user_id = owner, public_id = publicId, rating_history_public = 1) => ({
  id: 7, user_id, public_id, name: 'Beer Friend', rating_history_public
})
const response = () => ({ status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } })
const install = (rows = {}) => {
  const calls = []
  dataProvider.list = async (collection, filters) => {
    calls.push({ collection, filters })
    return (rows[collection] || []).filter((row) => Object.entries(filters || {}).every(([key, value]) => String(row[key]) === String(value)))
  }
  dataProvider.listPage = async (collection, options) => {
    const all = await dataProvider.list(collection, options.filters)
    return { items: all.slice((options.page - 1) * options.limit, options.page * options.limit), totalPages: Math.ceil(all.length / options.limit) }
  }
  dataProvider.get = async (collection, id) => {
    calls.push({ collection, id })
    return (rows[collection] || []).find((row) => String(row.id) === String(id)) || null
  }
  return calls
}
const breakdownRows = () => ({
  [COLLECTIONS.ratings]: [rating()],
  [COLLECTIONS.ratingScores]: [
    { id: 11, rating_id: 1, user_id: owner, attribute_id: 2, attribute_score: 1 },
    { id: 12, rating_id: 1, user_id: owner, attribute_id: 7, attribute_score: 0 },
    { id: 13, rating_id: 1, user_id: owner, attribute_id: 8, attribute_score: 0 },
    { id: 14, rating_id: 1, user_id: owner, attribute_id: 1, attribute_score: 7 }
  ],
  [COLLECTIONS.ratingAttributes]: [
    { id: 2, attribute_name: 'Appearence', is_scored: 1, weighting: 0.1 },
    { id: 7, attribute_name: 'Bonus', is_scored: 1 },
    { id: 8, attribute_name: 'Burp', is_scored: 0 },
    { id: 1, attribute_name: 'Design', is_scored: 0 }
  ],
  [COLLECTIONS.bonusRatingMappings]: [{ id: 21, rating_id: 1, user_id: owner, bonus_attribute_id: 5 }],
  [COLLECTIONS.bonusAttributes]: [{ id: 5, description: 'Balanced like a trapeze artist', point_value: 0.1 }]
})

test('historical breakdown projects recorded values including zero scores and optional extras', async () => {
  install(breakdownRows())
  const result = await loadRatingBreakdown(rating())
  assert.deepEqual(result, {
    scores: [{ name: 'Design', score: 7, scale: 7, scored: false },
      { name: 'Appearance', score: 1, scale: 7, scored: true },
      { name: 'Bonus', score: 0, scale: 2, scored: true }, { name: 'Burp', score: 0, scale: 1, scored: false }],
    selected_attributes: [{ description: 'Balanced like a trapeze artist' }], incomplete: false
  })
  assert.equal(/user_id|attribute_id|weighting|point_value|secret_key/.test(JSON.stringify(result)), false)
})

test('missing definitions and invalid component values are marked incomplete without inventing scores', async () => {
  const rows = breakdownRows()
  rows.rating_scores[0].attribute_score = 0
  rows.rating_scores[1].attribute_id = 99
  install(rows)
  const result = await loadRatingBreakdown(rating())
  assert.equal(result.incomplete, true)
  assert.deepEqual(result.scores.map((item) => item.name), ['Design', 'Burp'])
  install({})
  assert.deepEqual(await loadRatingBreakdown(rating()), { scores: [], selected_attributes: [], incomplete: false })
})

test('private breakdown rejects another account and incomplete/deleted parents before reading children', async () => {
  for (const parent of [rating(1, 'other-owner'), { ...rating(), submission_state: 'deleting' }, { ...rating(), deleted_at: '2026-10-08' }]) {
    const calls = install({ [COLLECTIONS.ratings]: [parent] })
    const result = response()
    await __testables.routeRatingRequest({ method: 'GET', query: { path: ['ratings', '1', 'breakdown'] } }, result, { id: owner })
    assert.equal(result.statusCode, 404)
    assert.deepEqual(calls, [{ collection: COLLECTIONS.ratings, id: '1' }])
  }
})

test('public breakdown requires current opt-in and the rating belonging to that exact public profile', async () => {
  for (const [publicProfile, parent] of [[profile(owner, publicId, 0), rating()], [profile(), rating(1, 'other-owner')]]) {
    const calls = install({ [COLLECTIONS.profiles]: [publicProfile], [COLLECTIONS.ratings]: [parent] })
    const result = response()
    await routeProfileRequest({ method: 'GET', query: { path: ['profiles', publicId, 'ratings', '1', 'breakdown'] } }, result, { id: 'viewer' })
    assert.equal(result.statusCode, 404)
    assert.equal(calls.some((call) => call.collection === COLLECTIONS.ratingScores), false)
    if (!publicProfile.rating_history_public) assert.equal(calls.some((call) => call.collection === COLLECTIONS.ratings), false)
  }
  install({ ...breakdownRows(), [COLLECTIONS.profiles]: [profile()] })
  const result = response()
  await routeProfileRequest({ method: 'GET', query: { path: ['profiles', publicId, 'ratings', '1', 'breakdown'] } }, result, { id: 'viewer' })
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.breakdown.scores.length, 4)
  assert.equal(JSON.stringify(result.body).includes(owner), false)
})

test('public history selects an older canonical rating page and retains headers when product enrichment fails', async () => {
  const rows = Array.from({ length: 45 }, (_, index) => rating(index + 1))
  install({ [COLLECTIONS.ratings]: [...rows, rating(99, 'other-owner'), { ...rating(100), submission_state: 'deleted' }] })
  dataProvider.get = async () => { throw new Error('metadata unavailable') }
  const result = await loadPublicRatingHistory(owner, { ratingId: '25' })
  assert.equal(result.page, 2)
  assert.equal(result.totalPages, 3)
  assert.deepEqual(result.summary, { count: 45, average: 4 })
  assert.equal(result.ratings[0].id, 25)
  assert.equal(result.ratings.length, 20)
  assert.ok(result.ratings.every((item) => item.product === null))
  for (const id of ['99', '100', '1700000000000001']) {
    await assert.rejects(loadPublicRatingHistory(owner, { ratingId: id }), (error) => error.status === 404 && error.code === 'rating_not_found')
  }
})

test('beer shared history includes only other owners with opted-in authoritative profiles', async () => {
  const calls = install({
    [COLLECTIONS.ratings]: [rating(1), rating(2, 'private-owner'), rating(3, 'viewer'), rating(4, 'no-profile'),
      { ...rating(5), product_id: 9 }, { ...rating(6), submission_state: 'failed' }],
    [COLLECTIONS.profiles]: [profile(), profile('private-owner', 'profile_private1234', 0)]
  })
  const result = await loadSharedProductRatings('4', 'viewer', { page: 9 })
  assert.deepEqual(result, { items: [{ id: 1, product_id: 4, date_rated: rating().date_rated, total_weighted: 4,
    author: { public_id: publicId, name: 'Beer Friend' } }], page: 1, pageSize: 20, total: 1, totalPages: 1 })
  assert.equal(JSON.stringify(result).includes('user_id'), false)
  assert.deepEqual(calls[0].filters, { product_id: '4' })
  assert.equal(calls.filter((call) => call.collection === COLLECTIONS.profiles && call.filters.user_id === owner).length, 1)
})

test('shared profile lookup failure does not masquerade as an empty shared history', async () => {
  install({ [COLLECTIONS.ratings]: [rating()], [COLLECTIONS.profiles]: [profile(), { ...profile(), id: 8 }] })
  await assert.rejects(loadSharedProductRatings('4', 'viewer'), (error) => error.code === 'PROFILE_PROVIDER_INVALID')
})

test('shared profile lookups are cached per owner and bounded to four concurrent reads', async () => {
  const rows = Array.from({ length: 12 }, (_, index) => rating(index + 1, `owner-${index + 1}`))
  install({ [COLLECTIONS.ratings]: [...rows, { ...rows[0], id: 99 }] })
  let active = 0; let maximum = 0; let reads = 0
  dataProvider.list = async (collection, filters) => {
    if (collection === COLLECTIONS.ratings) return [...rows, { ...rows[0], id: 99 }]
    active += 1; reads += 1; maximum = Math.max(maximum, active)
    await new Promise(setImmediate)
    active -= 1
    return [profile(filters.user_id, `profile_${filters.user_id.padEnd(12, '_')}`)]
  }
  const result = await loadSharedProductRatings('4', 'viewer')
  assert.equal(result.items.length, 13)
  assert.equal(maximum, 4)
  assert.equal(reads, 12)
})

test('shared profile timeout rejects the response rather than returning partial privacy checks', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'] })
  install({ [COLLECTIONS.ratings]: [rating()] })
  const list = dataProvider.list
  dataProvider.list = async (collection, filters) => collection === COLLECTIONS.profiles ? new Promise(() => {}) : list(collection, filters)
  const pending = loadSharedProductRatings('4', 'viewer')
  const rejected = assert.rejects(pending, (error) => error.status === 503)
  await new Promise(setImmediate)
  context.mock.timers.tick(5_000)
  await rejected
})

test('malformed public history selectors fail before profile or rating provider reads', async () => {
  const calls = install({})
  for (const query of [{ page: '2x' }, { limit: '51' }, { rating_id: '0' }, { rating_id: '' }]) {
    await assert.rejects(routeProfileRequest({ method: 'GET', query: { path: ['profiles', publicId], ...query } }, response(), { id: owner }), (error) => error.status === 400)
  }
  assert.equal(calls.length, 0)
})
