import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../dataProvider.js'
import { __testables } from '../brewDoneItEntry.js'

const originalProviderMethods = { ...dataProvider }
const originalSecret = process.env.NOCODEBACKEND_SECRET_KEY

afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
  if (originalSecret === undefined) delete process.env.NOCODEBACKEND_SECRET_KEY
  else process.env.NOCODEBACKEND_SECRET_KEY = originalSecret
})

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

const installReadProvider = (games, rounds) => {
  dataProvider.list = async (collection, filters = {}) => {
    const rows = collection === COLLECTIONS.brewDoneItGames
      ? games
      : collection === COLLECTIONS.brewDoneItRounds
        ? rounds
        : []
    return rows.filter((record) => Object.entries(filters).every(([key, value]) => String(record[key]) === String(value)))
  }
  dataProvider.get = async (collection, id) => {
    const rows = collection === COLLECTIONS.brewDoneItGames
      ? games
      : collection === COLLECTIONS.brewDoneItRounds
        ? rounds
        : []
    return rows.find((record) => String(record.id) === String(id)) || null
  }
}

test('series listing returns only participant games and hides an active secret from its guesser', async () => {
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-only-secret'
  const games = [
    { id: 1, creator_participant_id: 'alpha', opponent_participant_id: 'beta', status: 'active', current_round_number: 1, created_at: '2026-09-01T00:00:00.000Z', last_activity_at: '2026-09-02T00:00:00.000Z', version: 2 },
    { id: 2, creator_participant_id: 'beta', opponent_participant_id: 'gamma', status: 'active', current_round_number: 1, created_at: '2026-09-03T00:00:00.000Z', last_activity_at: '2026-09-04T00:00:00.000Z', version: 1 },
    { id: 3, creator_participant_id: 'outsider', opponent_participant_id: 'other', status: 'active', current_round_number: 1, created_at: '2026-09-05T00:00:00.000Z', last_activity_at: '2026-09-06T00:00:00.000Z', version: 1 }
  ]
  const rounds = [
    { id: 10, game_id: 1, round_number: 1, selector_participant_id: 'alpha', guesser_participant_id: 'beta', selected_product_id: 77, status: 'guessing', turn_sequence: 0, max_turns: 20, question_count: 0, incorrect_guess_count: 0, version: 0 },
    { id: 20, game_id: 2, round_number: 1, selector_participant_id: 'beta', guesser_participant_id: 'gamma', selected_product_id: 88, status: 'guessing', turn_sequence: 0, max_turns: 20, question_count: 0, incorrect_guess_count: 0, version: 0 }
  ]
  installReadProvider(games, rounds)

  const result = response()
  await __testables.listParticipantSeries(result, { id: 'beta' })

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body.series.map((item) => item.game.id), [2, 1])
  const guessingSeries = result.body.series.find((item) => item.game.id === 1)
  assert.equal(guessingSeries.round.selected_product_id, undefined)
  const selectingSeries = result.body.series.find((item) => item.game.id === 2)
  assert.equal(selectingSeries.round.selected_product_id, 88)
  assert.equal(result.body.series.some((item) => item.game.id === 3), false)
})

test('waiting challenge creator can recover the original invitation code after refresh', async () => {
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-only-secret'
  const game = {
    id: 4,
    creator_participant_id: 'alpha',
    opponent_participant_id: null,
    status: 'waiting',
    current_round_number: 1,
    creation_idempotency_key: 'alpha:brew-test-idempotency-0001',
    created_at: '2026-09-01T00:00:00.000Z',
    last_activity_at: '2026-09-01T00:00:00.000Z',
    version: 0
  }
  installReadProvider([game], [])

  const result = response()
  await __testables.listParticipantSeries(result, { id: 'alpha' })

  assert.equal(result.body.series.length, 1)
  assert.equal(typeof result.body.series[0].invitationCode, 'string')
  assert.ok(result.body.series[0].invitationCode.length >= 32)
  assert.equal(result.body.series[0].game.creation_idempotency_key, undefined)
})

test('entry routing intercepts only series reads, game reads and durable round actions', () => {
  assert.deepEqual(__testables.routeKind({ method: 'GET', query: { path: ['brew-done-it', 'games'] } }), { kind: 'series-list' })
  assert.deepEqual(__testables.routeKind({ method: 'GET', query: { path: ['brew-done-it', 'games', '1'] } }), { kind: 'game-detail', id: '1' })
  assert.deepEqual(__testables.routeKind({ method: 'POST', query: { path: ['brew-done-it', 'rounds', '10', 'guesses'] } }), { kind: 'guess', id: '10' })
  assert.deepEqual(__testables.routeKind({ method: 'POST', query: { path: ['brew-done-it', 'rounds', '10', 'questions'] } }), { kind: 'question', id: '10' })
  assert.deepEqual(__testables.routeKind({ method: 'POST', query: { path: ['brew-done-it', 'rounds', '10', 'forfeit'] } }), { kind: 'forfeit', id: '10' })
  assert.equal(__testables.routeKind({ method: 'POST', query: { path: ['brew-done-it', 'games'] } }), null)
})
