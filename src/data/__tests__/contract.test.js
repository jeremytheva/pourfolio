import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COLLECTIONS,
  NULLABLE_CELLAR_RELATIONSHIPS,
  normaliseNullableId,
  pickFields
} from '../contract.js'

test('canonical contract uses the supplied relational collection names', () => {
  assert.equal(COLLECTIONS.products, 'products')
  assert.equal(COLLECTIONS.ratings, 'ratings')
  assert.equal(COLLECTIONS.ratingScores, 'rating_scores')
  assert.equal(COLLECTIONS.cellar, 'cellar')
})

test('sharing series and edition relationships remain optional', () => {
  assert.deepEqual(NULLABLE_CELLAR_RELATIONSHIPS, ['sharing_series_id', 'series_edition_id'])
  assert.equal(normaliseNullableId(''), null)
  assert.equal(normaliseNullableId(null), null)
})

test('fabricated zero relationship identifiers are rejected', () => {
  assert.throws(() => normaliseNullableId(0), /must be null/)
  assert.throws(() => normaliseNullableId('0'), /must be null/)
})

test('field projection excludes unlisted sensitive fields', () => {
  assert.deepEqual(
    pickFields({ id: 1, name: 'Test', secret_key: 'hidden', user_id: 'private' }, ['id', 'name']),
    { id: 1, name: 'Test' }
  )
})
