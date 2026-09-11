import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../dataProvider.js'
import { __testables } from '../brewDoneItGateway.js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

const mutation = (values = {}, expectedVersion = 0, idempotencyKey = 'brew-test-idempotency-0001') => ({
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
      created_at: '2026-09-01T00:00:00.000Z',
      started_at: '2026-09-01T00:05:00.000Z'
    }],
    [COLLECTIONS.brewDoneItGuesses]: [],
    [COLLECTIONS.brewDoneItQuestions]: []
  }
  let nextId = 1000

  dataProvider.isUniqueConflict = (error) => error?.code === 'UNIQUE_CONFLICT'
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
    records[collection].push(created)
    return created
  }
  dataProvider.remove = async (collection, id) => {
    const index = records[collection].findIndex((record) => String(record.id) === String(id))
    if (index >= 0) records[collection].splice(index, 1)
  }
  dataProvider.compareAndSet = async (collection, id, expectedVersion, updates) => {
    const record = records[collection].find((candidate) => String(candidate.id) === String(id))
    if (!record || Number(record.version || 0) !== Number(expectedVersion)) {
      throw Object.assign(new Error('conflict'), { code: 'VERSION_CONFLICT', status: 409 })
    }
    Object.assign(record, updates)
    return record
  }

  return records
}

test('showing an active game does not send the secret beer to the guesser', async () => {
  installProvider()
  const result = response()
  await __testables.showGame(1, result, { id: 'beta' })

  assert.equal(result.statusCode, 200)
  assert.equal(result.body.rounds[0].selected_product_id, undefined)
  assert.deepEqual(result.body.rounds[0].guesses, [])
  assert.deepEqual(result.body.rounds[0].questions, [])
})

test('completed rounds reveal the beer and preserve their durable score', async () => {
  const records = installProvider()
  Object.assign(records[COLLECTIONS.brewDoneItRounds][0], {
    status: 'completed',
    completion_reason: 'correct_guess',
    completed_at: '2026-09-02T00:00:00.000Z',
    awarded_points: 8,
    scoring_rules_version: '2.0.0'
  })
  const result = response()
  await __testables.showGame(1, result, { id: 'beta' })

  assert.equal(result.body.rounds[0].selected_product_id, '100')
  assert.equal(result.body.rounds[0].awarded_points, 8)
})

test('the next round swaps selector and guesser and persists a new secret beer', async () => {
  const records = installProvider()
  Object.assign(records[COLLECTIONS.brewDoneItRounds][0], {
    status: 'completed',
    completion_reason: 'correct_guess',
    completed_at: '2026-09-02T00:00:00.000Z',
    awarded_points: 8
  })

  const result = response()
  await __testables.createNextRound(1, {
    body: mutation({ productId: 101 })
  }, result, { id: 'beta' })

  assert.equal(result.statusCode, 201)
  assert.equal(result.body.round.selector_participant_id, 'beta')
  assert.equal(result.body.round.guesser_participant_id, 'alpha')
  assert.equal(result.body.round.selected_product_id, '101')
  assert.equal(records[COLLECTIONS.brewDoneItGames][0].current_round_number, 2)

  const guesserView = response()
  await __testables.showGame(1, guesserView, { id: 'alpha' })
  assert.equal(guesserView.body.rounds[1].selected_product_id, undefined)
})

test('statistics aggregate scoring across persistent rounds and series', async () => {
  const records = installProvider()
  Object.assign(records[COLLECTIONS.brewDoneItRounds][0], {
    status: 'completed',
    completion_reason: 'correct_guess',
    completed_at: '2026-09-02T00:00:00.000Z',
    awarded_points: 8
  })
  records[COLLECTIONS.brewDoneItRounds].push({
    id: 11,
    game_id: 1,
    round_number: 2,
    selector_participant_id: 'beta',
    guesser_participant_id: 'alpha',
    selected_product_id: '101',
    status: 'completed',
    completion_reason: 'correct_guess',
    completed_at: '2026-09-08T00:00:00.000Z',
    awarded_points: 6,
    version: 2
  })

  const beta = response()
  await __testables.statsForUser(beta, { id: 'beta' })
  assert.equal(beta.body.completedRounds, 2)
  assert.equal(beta.body.roundsAsGuesser, 1)
  assert.equal(beta.body.correctGuesses, 1)
  assert.equal(beta.body.awardedPoints, 8)
  assert.equal(beta.body.headToHead[0].pointsFor, 8)
  assert.equal(beta.body.headToHead[0].pointsAgainst, 6)
})

test('only the designated guesser can submit a guess', async () => {
  installProvider()
  await assert.rejects(
    __testables.submitGuess(10, { body: mutation({ productId: 100 }) }, response(), { id: 'alpha' }),
    /Only the guesser/
  )
})
