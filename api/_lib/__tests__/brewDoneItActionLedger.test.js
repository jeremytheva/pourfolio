import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../dataProvider.js'
import {
  __testables,
  askSafeQuestion,
  showSafeGame,
  submitSafeGuess
} from '../brewDoneItActionLedger.js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

const mutation = (values = {}, expectedVersion = 0, idempotencyKey = 'brew-ledger-action-0001') => ({
  ...values,
  expectedVersion,
  idempotencyKey
})

const installProvider = () => {
  const records = {
    [COLLECTIONS.brewDoneItGames]: [{
      id: 1,
      creator_participant_id: 'alpha',
      opponent_participant_id: 'beta',
      status: 'active',
      current_round_number: 1,
      version: 0,
      created_at: '2026-09-01T00:00:00.000Z',
      joined_at: '2026-09-01T00:05:00.000Z',
      last_activity_at: '2026-09-01T00:05:00.000Z'
    }],
    [COLLECTIONS.brewDoneItRounds]: [{
      id: 10,
      game_id: 1,
      round_number: 1,
      selector_participant_id: 'alpha',
      guesser_participant_id: 'beta',
      selected_product_id: '100',
      status: 'guessing',
      turn_sequence: 0,
      max_turns: 20,
      question_count: 0,
      incorrect_guess_count: 0,
      version: 0,
      pending_action_key: null,
      pending_action_type: null,
      pending_action_started_at: null,
      last_action_key: null,
      last_action_type: null,
      created_at: '2026-09-01T00:00:00.000Z',
      started_at: '2026-09-01T00:05:00.000Z'
    }],
    [COLLECTIONS.brewDoneItGuesses]: [],
    [COLLECTIONS.brewDoneItQuestions]: []
  }
  let nextId = 1000
  const controls = {
    failNextChildCommit: false,
    createMode: 'normal'
  }

  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.products) return ['100', '101', '102'].includes(String(id))
      ? { id: String(id), producer_id: '20', product_category_id: '30', abv: 6.5, ibu: 45, collaboration: 0 }
      : null
    if (collection === COLLECTIONS.producers) return String(id) === '20' ? { id: '20' } : null
    if (collection === COLLECTIONS.categories) return String(id) === '30' ? { id: '30' } : null
    return records[collection]?.find((record) => String(record.id) === String(id)) || null
  }
  dataProvider.list = async (collection, filters = {}) => (records[collection] || [])
    .filter((record) => Object.entries(filters).every(([key, value]) => String(record[key]) === String(value)))
  dataProvider.create = async (collection, value) => {
    const created = { id: nextId++, ...value }
    if (controls.createMode !== 'fail-before-persist') records[collection].push(created)
    if (controls.createMode === 'persist-then-fail' || controls.createMode === 'fail-before-persist') {
      controls.createMode = 'normal'
      throw Object.assign(new Error('provider create failed'), { status: 502, code: 'PROVIDER_ERROR' })
    }
    return created
  }
  dataProvider.update = async (collection, id, updates) => {
    const record = records[collection]?.find((candidate) => String(candidate.id) === String(id))
    if (!record) throw Object.assign(new Error('not found'), { status: 404 })
    if (controls.failNextChildCommit && updates.action_state === 'committed') {
      controls.failNextChildCommit = false
      throw Object.assign(new Error('provider update failed'), { status: 502, code: 'PROVIDER_ERROR' })
    }
    Object.assign(record, updates)
    return record
  }
  dataProvider.compareAndSet = async (collection, id, expectedVersion, updates) => {
    const record = records[collection]?.find((candidate) => String(candidate.id) === String(id))
    if (!record || Number(record.version || 0) !== Number(expectedVersion)) {
      throw Object.assign(new Error('conflict'), { code: 'VERSION_CONFLICT', status: 409 })
    }
    Object.assign(record, updates)
    return record
  }

  return { records, controls }
}

test('a correct guess is reserved, committed and scored exactly once', async () => {
  const { records } = installProvider()
  const result = response()

  await submitSafeGuess(10, { body: mutation({ productId: 100 }) }, result, { id: 'beta' })

  const round = records[COLLECTIONS.brewDoneItRounds][0]
  const guess = records[COLLECTIONS.brewDoneItGuesses][0]
  assert.equal(result.statusCode, 201)
  assert.equal(round.version, 2)
  assert.equal(round.status, 'completed')
  assert.equal(round.awarded_points, 10)
  assert.equal(round.turn_sequence, 1)
  assert.equal(round.pending_action_key, null)
  assert.equal(guess.action_state, __testables.ACTION_COMMITTED)
  assert.equal(guess.committed_round_version, 2)
})

test('a lost child-commit response is repaired by an idempotent retry without a second turn', async () => {
  const { records, controls } = installProvider()
  controls.failNextChildCommit = true
  const request = { body: mutation({ productId: 101 }) }

  await assert.rejects(submitSafeGuess(10, request, response(), { id: 'beta' }), /provider update failed/)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].version, 2)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].turn_sequence, 1)
  assert.equal(records[COLLECTIONS.brewDoneItGuesses][0].action_state, __testables.ACTION_PENDING)

  const replay = response()
  await submitSafeGuess(10, request, replay, { id: 'beta' })

  assert.equal(replay.statusCode, 200)
  assert.equal(replay.body.replayed, true)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].version, 2)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].turn_sequence, 1)
  assert.equal(records[COLLECTIONS.brewDoneItGuesses].length, 1)
  assert.equal(records[COLLECTIONS.brewDoneItGuesses][0].action_state, __testables.ACTION_COMMITTED)
})

test('an ambiguous create timeout is reconciled when the provider actually persisted the guess', async () => {
  const { records, controls } = installProvider()
  controls.createMode = 'persist-then-fail'
  const result = response()

  await submitSafeGuess(10, { body: mutation({ productId: 101 }) }, result, { id: 'beta' })

  assert.equal(result.statusCode, 201)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].version, 2)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].turn_sequence, 1)
  assert.equal(records[COLLECTIONS.brewDoneItGuesses].length, 1)
  assert.equal(records[COLLECTIONS.brewDoneItGuesses][0].action_state, __testables.ACTION_COMMITTED)
})

test('a failed create with no persisted action rolls back the reservation without inventing a turn', async () => {
  const { records, controls } = installProvider()
  controls.createMode = 'fail-before-persist'

  await assert.rejects(
    submitSafeGuess(10, { body: mutation({ productId: 101 }) }, response(), { id: 'beta' }),
    /provider create failed/
  )

  const round = records[COLLECTIONS.brewDoneItRounds][0]
  assert.equal(round.version, 2)
  assert.equal(round.turn_sequence, 0)
  assert.equal(round.pending_action_key, null)
  assert.equal(records[COLLECTIONS.brewDoneItGuesses].length, 0)
})

test('controlled questions use the same durable action ledger and only committed history is shown', async () => {
  const { records } = installProvider()
  const asked = response()

  await askSafeQuestion(10, {
    body: mutation({ questionType: 'producer', referenceId: 20 })
  }, asked, { id: 'beta' })

  assert.equal(asked.statusCode, 201)
  assert.equal(asked.body.question.answer, true)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].version, 2)
  assert.equal(records[COLLECTIONS.brewDoneItRounds][0].question_count, 1)
  assert.equal(records[COLLECTIONS.brewDoneItQuestions][0].action_state, __testables.ACTION_COMMITTED)

  records[COLLECTIONS.brewDoneItGuesses].push({
    id: 2000,
    round_id: 10,
    turn_sequence: 2,
    guessed_product_id: '102',
    guesser_participant_id: 'beta',
    is_correct: false,
    idempotency_key: 'beta:orphaned-pending-action',
    action_state: __testables.ACTION_DISCARDED,
    created_at: '2026-09-02T00:00:00.000Z'
  })

  const game = response()
  await showSafeGame(1, game, { id: 'beta' })
  assert.equal(game.statusCode, 200)
  assert.equal(game.body.rounds[0].questions.length, 1)
  assert.equal(game.body.rounds[0].guesses.length, 0)
})
