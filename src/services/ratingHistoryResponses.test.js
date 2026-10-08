import assert from 'node:assert/strict'
import test from 'node:test'
import { validateRatingBreakdown } from './ratingBreakdownResponse.js'
import { validateSharedRatings } from './sharedRatingResponse.js'
import { validatePublicProfileResponse } from './publicProfileResponse.js'

const publicId = 'profile_abcdefgh1234'
const item = () => ({ id: 1, product_id: 4, date_rated: '2026-10-08', total_weighted: 4,
  author: { public_id: publicId, name: 'Beer Friend' } })
const shared = () => ({ items: [item()], page: 1, pageSize: 20, total: 1, totalPages: 1 })
const breakdown = () => ({ breakdown: { scores: [{ name: 'Bonus', score: 0, scale: 2, scored: true }],
  selected_attributes: [{ description: 'Balanced' }], incomplete: false } })

test('breakdown accepts recorded zero values and rejects private fields, malformed scores and fabricated weights', () => {
  const valid = breakdown()
  assert.equal(validateRatingBreakdown(valid), valid.breakdown)
  for (const mutate of [
    (payload) => { payload.breakdown.user_id = 'private-owner' },
    (payload) => { payload.breakdown.scores[0].weighting = 0.1 },
    (payload) => { payload.breakdown.scores[0].score = null },
    (payload) => { payload.breakdown.scores[0].score = 3 },
    (payload) => { payload.breakdown.selected_attributes[0].bonus_attribute_id = 5 }
  ]) {
    const payload = breakdown(); mutate(payload)
    assert.throws(() => validateRatingBreakdown(payload), (error) => error.code === 'invalid_rating_breakdown')
  }
})

test('shared rating projection rejects wrong products, duplicate ratings, owner identifiers and inconsistent pagination', () => {
  const valid = shared()
  assert.equal(validateSharedRatings(valid, 4), valid)
  for (const mutate of [
    (payload) => { payload.items[0].product_id = 9 },
    (payload) => { payload.items[0].author.user_id = 'private-owner' },
    (payload) => { payload.items[0].cellar_id = 10 },
    (payload) => { payload.items.push(item()); payload.total = 2 },
    (payload) => { payload.total = 3 },
    (payload) => { payload.items[0].total_weighted = null }
  ]) {
    const payload = shared(); mutate(payload)
    assert.throws(() => validateSharedRatings(payload, 4), (error) => error.code === 'invalid_shared_ratings')
  }
})

test('public profile permits a paged exact-entry response and nullable metadata without private fields', () => {
  const payload = { profile: { public_id: publicId, name: 'Beer Friend', description: '', avatar_url: null },
    ratings: [{ id: 1, product_id: 4, date_rated: '2026-10-08', total_weighted: 4, product: null }],
    summary: { count: 21, average: 4 }, page: 2, pageSize: 20, totalPages: 2 }
  assert.equal(validatePublicProfileResponse(payload, publicId, '1'), payload)
  assert.throws(() => validatePublicProfileResponse(payload, publicId, '2'), (error) => error.code === 'invalid_public_profile_response')
  assert.throws(() => validatePublicProfileResponse({ ...payload, totalPages: 3 }, publicId), (error) => error.code === 'invalid_public_profile_response')
  assert.throws(() => validatePublicProfileResponse({ ...payload, page: 1 }, publicId), (error) => error.code === 'invalid_public_profile_response')
})
