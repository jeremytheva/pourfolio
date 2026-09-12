import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItSeriesV3.js'

const {
  canAdoptPersistedRound,
  creationRequestFingerprint,
  invitationCodeFor,
  invitationDigest,
  initialRoundBody,
  nextRoundBody,
  mutation
} = __testables

const withSigningKey = (run) => {
  const previous = process.env.BREW_DONE_IT_INVITATION_KEY
  process.env.BREW_DONE_IT_INVITATION_KEY = 'test-only-brew-signing-key'
  try { return run() } finally {
    if (previous === undefined) delete process.env.BREW_DONE_IT_INVITATION_KEY
    else process.env.BREW_DONE_IT_INVITATION_KEY = previous
  }
}

test('challenge creation fingerprint binds one idempotency key to one selected beer', () => withSigningKey(() => {
  const key = 'user-1:brew-done-it-1234567890abcdef'
  const first = creationRequestFingerprint(key, '12')
  assert.equal(first, creationRequestFingerprint(key, '12'))
  assert.notEqual(first, creationRequestFingerprint(key, '13'))
  assert.notEqual(first, creationRequestFingerprint('user-1:brew-done-it-fedcba0987654321', '12'))
}))

test('invitation code is deterministic while stored digest does not equal the raw code', () => withSigningKey(() => {
  const code = invitationCodeFor('user-1:brew-done-it-1234567890abcdef')
  assert.equal(code, invitationCodeFor('user-1:brew-done-it-1234567890abcdef'))
  assert.notEqual(invitationDigest(code), code)
}))

test('v3 opening and next rounds initialize deduction outcome state explicitly', () => {
  const game = { id: 7, creator_participant_id: 10, opponent_participant_id: 20 }
  const opening = initialRoundBody(game, '33', '2026-09-12T00:00:00.000Z')
  assert.equal(opening.selected_product_id, '33')
  assert.equal(opening.brewery_correct, false)
  assert.equal(opening.style_correct, false)
  assert.equal(opening.beer_correct, false)
  assert.equal(opening.incorrect_formal_guess_count, 0)

  const next = nextRoundBody({
    game,
    previous: { round_number: 1, selector_participant_id: 10, guesser_participant_id: 20 },
    productId: '44',
    requestKey: '20:brew-done-it-1234567890abcdef',
    now: '2026-09-12T01:00:00.000Z'
  })
  assert.equal(next.round_number, 2)
  assert.equal(next.selector_participant_id, 20)
  assert.equal(next.guesser_participant_id, 10)
  assert.equal(next.selected_product_id, '44')
  assert.equal(next.round_creation_idempotency_key, '20:brew-done-it-1234567890abcdef')
})

test('persisted next round remains safely adoptable after unrelated game version changes', () => {
  const game = {
    id: 7,
    creator_participant_id: 10,
    opponent_participant_id: 20,
    status: 'active',
    current_round_number: 1,
    version: 5
  }
  const predecessor = {
    id: 101,
    game_id: 7,
    round_number: 1,
    selector_participant_id: 10,
    guesser_participant_id: 20,
    status: 'completed'
  }
  const persisted = {
    id: 102,
    game_id: 7,
    round_number: 2,
    selector_participant_id: 20,
    guesser_participant_id: 10,
    status: 'guessing'
  }

  assert.equal(canAdoptPersistedRound(game, [predecessor, persisted], persisted, 20), true)
})

test('persisted next round is not adoptable when predecessor or role rotation no longer matches', () => {
  const game = {
    id: 7,
    creator_participant_id: 10,
    opponent_participant_id: 20,
    status: 'active',
    current_round_number: 1,
    version: 5
  }
  const predecessor = {
    id: 101,
    game_id: 7,
    round_number: 1,
    selector_participant_id: 10,
    guesser_participant_id: 20,
    status: 'completed'
  }
  const wrongRoles = {
    id: 102,
    game_id: 7,
    round_number: 2,
    selector_participant_id: 10,
    guesser_participant_id: 20,
    status: 'guessing'
  }

  assert.equal(canAdoptPersistedRound(game, [predecessor, wrongRoles], wrongRoles, 20), false)
  assert.equal(canAdoptPersistedRound({ ...game, current_round_number: 2 }, [predecessor, wrongRoles], wrongRoles, 20), false)
  assert.equal(canAdoptPersistedRound({ ...game, status: 'archived' }, [predecessor, wrongRoles], wrongRoles, 20), false)
})

test('series mutation contract requires an optimistic version and durable request key', () => {
  assert.deepEqual(
    mutation({ body: { expectedVersion: 3, idempotencyKey: 'brew-done-it-1234567890abcdef' } }),
    { expectedVersion: 3, idempotencyKey: 'brew-done-it-1234567890abcdef' }
  )
  assert.throws(() => mutation({ body: { expectedVersion: -1, idempotencyKey: 'brew-done-it-1234567890abcdef' } }), /expected version/i)
  assert.throws(() => mutation({ body: { expectedVersion: 0, idempotencyKey: 'short' } }), /idempotency key/i)
})
