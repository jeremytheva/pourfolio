import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../dataProvider.js'
import { forfeitSafeRound } from '../brewDoneItRoundTransitions.js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

const request = (expectedVersion, idempotencyKey = 'brew-forfeit-action-0001') => ({
  body: { expectedVersion, idempotencyKey }
})

const installProvider = ({ pending = false } = {}) => {
  const game = {
    id: 1,
    creator_participant_id: 'alpha',
    opponent_participant_id: 'beta',
    status: 'active',
    version: 0
  }
  const round = {
    id: 10,
    game_id: 1,
    selector_participant_id: 'alpha',
    guesser_participant_id: 'beta',
    selected_product_id: '100',
    status: 'guessing',
    turn_sequence: 0,
    max_turns: 20,
    question_count: 0,
    incorrect_guess_count: 0,
    version: pending ? 1 : 0,
    pending_action_key: pending ? 'beta:lost-action-key-0001' : null,
    pending_action_type: pending ? 'guess' : null,
    pending_action_started_at: pending ? '2026-09-01T00:00:00.000Z' : null,
    last_action_key: null,
    last_action_type: null
  }
  const collections = {
    [COLLECTIONS.brewDoneItGames]: [game],
    [COLLECTIONS.brewDoneItRounds]: [round],
    [COLLECTIONS.brewDoneItGuesses]: [],
    [COLLECTIONS.brewDoneItQuestions]: []
  }

  dataProvider.get = async (collection, id) => collections[collection]?.find((record) => String(record.id) === String(id)) || null
  dataProvider.list = async (collection, filters = {}) => (collections[collection] || [])
    .filter((record) => Object.entries(filters).every(([key, value]) => String(record[key]) === String(value)))
  dataProvider.compareAndSet = async (collection, id, expectedVersion, updates) => {
    const record = collections[collection].find((candidate) => String(candidate.id) === String(id))
    if (!record || Number(record.version || 0) !== Number(expectedVersion)) {
      throw Object.assign(new Error('conflict'), { code: 'VERSION_CONFLICT', status: 409 })
    }
    Object.assign(record, updates)
    return record
  }
  dataProvider.update = async (collection, id, updates) => {
    const record = collections[collection].find((candidate) => String(candidate.id) === String(id))
    Object.assign(record, updates)
    return record
  }

  return { game, round }
}

test('forfeit cannot bypass an unresolved action reservation', async () => {
  const { round } = installProvider({ pending: true })

  await assert.rejects(
    forfeitSafeRound(10, request(0), response(), { id: 'beta' }),
    (error) => error?.payload?.code === 'VERSION_CONFLICT'
  )

  assert.equal(round.status, 'guessing')
  assert.equal(round.turn_sequence, 0)
  assert.equal(round.pending_action_key, null)
  assert.equal(round.version, 2)

  const result = response()
  await forfeitSafeRound(10, request(2), result, { id: 'beta' })
  assert.equal(result.statusCode, 200)
  assert.equal(round.status, 'forfeited')
  assert.equal(round.version, 3)
  assert.equal(round.awarded_points, 0)
})

test('forfeit retry is idempotent after the terminal transition', async () => {
  const { round } = installProvider()
  const first = response()
  await forfeitSafeRound(10, request(0), first, { id: 'alpha' })
  assert.equal(round.version, 1)

  const replay = response()
  await forfeitSafeRound(10, request(0), replay, { id: 'alpha' })
  assert.equal(replay.statusCode, 200)
  assert.equal(replay.body.replayed, true)
  assert.equal(round.version, 1)
})
