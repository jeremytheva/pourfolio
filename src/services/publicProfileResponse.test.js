import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../lib/nocodeBackend.js'
import { normalisePublicProfileId, validatePublicProfileResponse } from './publicProfileResponse.js'

const validPayload = () => ({
  profile: {
    public_id: 'profile_abcdefgh1234',
    name: 'Beer Friend',
    description: 'Likes dark beer.',
    avatar_url: null
  },
  ratings: [
    {
      id: 14,
      product_id: 22,
      date_rated: '2026-09-10T10:00:00.000Z',
      total_unweighted: 4.2,
      total_weighted: 4.4,
      product: {
        id: 22,
        product_name: 'Example Stout',
        producer: { id: 3, producer_name: 'Example Brewery' }
      }
    }
  ],
  summary: { count: 1, average: 4.4 }
})

test('accepts the safe public profile and rated-beer projection unchanged', () => {
  const payload = validPayload()
  assert.equal(validatePublicProfileResponse(payload, 'profile_abcdefgh1234'), payload)
})

test('rejects private identity and owner-only fields anywhere in the public envelope', () => {
  for (const mutation of [
    (payload) => { payload.user_id = 'secret-owner-id' },
    (payload) => { payload.profile.user_id = 'secret-owner-id' },
    (payload) => { payload.profile.email = 'private@example.com' },
    (payload) => { payload.ratings[0].cellar_id = 9 },
    (payload) => { payload.ratings[0].user_id = 'secret-owner-id' },
    (payload) => { payload.ratings[0].scores = [{ attribute_id: 2, attribute_score: 7 }] }
  ]) {
    const payload = validPayload()
    mutation(payload)
    assert.throws(() => validatePublicProfileResponse(payload), (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.code, 'invalid_public_profile_response')
      return true
    })
  }
})

test('rejects incoherent summaries, duplicate ratings and product mismatches', () => {
  const wrongCount = validPayload()
  wrongCount.summary.count = 2
  assert.throws(() => validatePublicProfileResponse(wrongCount), ApiError)

  const duplicate = validPayload()
  duplicate.ratings.push({ ...duplicate.ratings[0] })
  duplicate.summary.count = 2
  assert.throws(() => validatePublicProfileResponse(duplicate), ApiError)

  const wrongProduct = validPayload()
  wrongProduct.ratings[0].product.id = 99
  assert.throws(() => validatePublicProfileResponse(wrongProduct), ApiError)
})

test('rejects a valid response for a different public profile identifier', () => {
  assert.throws(
    () => validatePublicProfileResponse(validPayload(), 'profile_different5678'),
    (error) => error instanceof ApiError && error.code === 'invalid_public_profile_response'
  )
})

test('public profile identifiers are opaque URL-safe values, not arbitrary input', () => {
  assert.equal(normalisePublicProfileId('profile_abcdefgh1234'), 'profile_abcdefgh1234')
  assert.equal(normalisePublicProfileId('c3bc4470-7251-43e9-b34b-2399e13bd1dc'), 'c3bc4470-7251-43e9-b34b-2399e13bd1dc')
  for (const invalid of ['', 'short', 'contains space', '../secret', 'email@example.com']) {
    assert.throws(() => normalisePublicProfileId(invalid), ApiError)
  }
})
