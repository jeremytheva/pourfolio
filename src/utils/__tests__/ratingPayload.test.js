import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRatingPayload, getRatingAttributeScores } from '../ratingPayload.js'

test('getRatingAttributeScores maps supported schema attribute scores only', () => {
  assert.deepEqual(getRatingAttributeScores({
    appearance: { score: 4 },
    aroma: { score: '3.5' },
    taste: { score: 5 },
    mouthfeel: { score: 2 },
    overall: { score: 4.5 },
    design: { score: 1 },
    balance: { score: 'not a number' }
  }), {
    appearance: 4,
    aroma: 3.5,
    taste: 5,
    mouthfeel: 2,
    overall: 4.5
  })
})

test('buildRatingPayload creates the ratings_pf2025 create payload', () => {
  assert.deepEqual(buildRatingPayload({
    userId: 'user-123',
    beverageId: 'bev-456',
    rating: '4.25',
    notes: '  Bright citrus and resin.  ',
    mainAttributes: {
      appearance: { score: 4 },
      aroma: { score: 4.5 },
      taste: { score: 5 },
      mouthfeel: { score: 3.5 },
      overall: { score: 4 }
    },
    timestamp: '2026-07-22T00:00:00.000Z'
  }), {
    user_id: 'user-123',
    beverage_id: 'bev-456',
    rating: 4.25,
    notes: 'Bright citrus and resin.',
    appearance: 4,
    aroma: 4.5,
    taste: 5,
    mouthfeel: 3.5,
    overall: 4,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z'
  })
})

test('buildRatingPayload rejects missing required identifiers', () => {
  assert.throws(() => buildRatingPayload({
    beverageId: 'bev-456',
    rating: 4
  }), /signed-in user/)

  assert.throws(() => buildRatingPayload({
    userId: 'user-123',
    rating: 4
  }), /beverage/)
})
