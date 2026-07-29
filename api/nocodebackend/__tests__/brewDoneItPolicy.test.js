import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { projectBrewDoneItRound } from '../../_lib/dataPolicy.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../[...path].js'

const originalProviderMethods = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, originalProviderMethods))

const selector = { id: 'selector' }
const guesser = { id: 'guesser' }
const outsider = { id: 'outsider' }
const response = () => ({
  statusCode: null, body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

const installProvider = () => {
  const records = {
    [COLLECTIONS.brewDoneItGames]: [{
      id: 1, selector_participant_id: selector.id, guesser_participant_id: guesser.id,
      status: 'active', created_at: '2026-01-01T00:00:00.000Z'
    }],
    [COLLECTIONS.brewDoneItRounds]: [{
      id: 2, game_id: 1, round_number: 1, selector_participant_id: selector.id,
      guesser_participant_id: guesser.id, selected_product_id: '10', status: 'guessing',
      turn_sequence: 0, max_turns: 6, question_count: 0, created_at: '2026-01-01T00:00:00.000Z'
    }],
    [COLLECTIONS.brewDoneItGuesses]: []
  }
  let nextId = 20
  dataProvider.isUniqueConflict = (error) => error?.status === 409
  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.products) return ['10', '11'].includes(String(id))
      ? { id, producer_id: 30, product_category_id: 40 }
      : null
    if (collection === COLLECTIONS.producers) return String(id) === '30' ? { id } : null
    if (collection === COLLECTIONS.categories) return String(id) === '40' ? { id, parent_id: null } : null
    return records[collection]?.find((record) => String(record.id) === String(id)) || null
  }
  dataProvider.list = async (collection, filters = {}) => (records[collection] || [])
    .filter((record) => Object.entries(filters).every(([key, value]) => String(record[key]) === String(value)))
  dataProvider.create = async (collection, value) => {
    if (records[collection].some((record) => value.uniqueness_key && record.uniqueness_key === value.uniqueness_key)) {
      throw Object.assign(new Error('conflict'), { status: 409 })
    }
    const created = { id: nextId++, ...value }
    records[collection].push(created)
    return created
  }
  dataProvider.update = async (collection, id, updates) => {
    const record = records[collection].find((candidate) => String(candidate.id) === String(id))
    Object.assign(record, updates)
    return record
  }
  return records
}

test('the selected product is hidden from the guesser until completion', () => {
  const round = { selected_product_id: 10, selector_participant_id: selector.id, status: 'guessing' }
  assert.equal(projectBrewDoneItRound(round, guesser.id).selected_product_id, undefined)
  assert.equal(projectBrewDoneItRound(round, selector.id).selected_product_id, 10)
  assert.equal(projectBrewDoneItRound({ ...round, status: 'completed' }, guesser.id).selected_product_id, 10)
})

test('non-participants cannot read a game or impersonate the guesser', async () => {
  installProvider()
  await assert.rejects(__testables.showBrewDoneItGame(1, response(), outsider), (error) => error.status === 404)
  await assert.rejects(
    __testables.submitBrewDoneItGuess(2, { body: { guessType: 'product', productId: 10 } }, response(), outsider),
    (error) => error.status === 404
  )
})

test('roles cannot be swapped for selection or guessing', async () => {
  installProvider()
  await assert.rejects(
    __testables.selectBrewDoneItProduct(2, { body: { productId: 10 } }, response(), guesser),
    /Only the selector/
  )
  await assert.rejects(
    __testables.submitBrewDoneItGuess(2, { body: { guessType: 'product', productId: 10 } }, response(), selector),
    /Only the designated guesser/
  )
})

test('owner, participant, turn, score and completion fields are ignored or server-derived', async () => {
  const records = installProvider()
  const result = response()
  await __testables.submitBrewDoneItGuess(2, { body: {
    guessType: 'product', productId: 10, guesser_participant_id: outsider.id,
    turn_sequence: 99, awarded_points: 999, is_correct: false
  } }, result, guesser)
  assert.equal(result.statusCode, 201)
  assert.equal(records.brew_done_it_guesses[0].guesser_participant_id, guesser.id)
  assert.equal(records.brew_done_it_guesses[0].turn_sequence, 1)
  assert.equal(records.brew_done_it_guesses[0].awarded_points, 10)
  assert.equal(records.brew_done_it_guesses[0].is_correct, true)
  assert.equal(records.brew_done_it_rounds[0].scoring_rules_version, '1.0.0')
  assert.equal(records.brew_done_it_rounds[0].awarded_points, 10)
})

test('replayed turns and completed-round mutations are rejected', async () => {
  const records = installProvider()
  records.brew_done_it_guesses.push({
    id: 8, round_id: 2, uniqueness_key: '2:1', turn_sequence: 1,
    guess_type: 'product', guessed_reference_id: '12'
  })
  await assert.rejects(
    __testables.submitBrewDoneItGuess(2, { body: { guessType: 'product', productId: 11 } }, response(), guesser),
    (error) => error.status === 409
  )
  records.brew_done_it_rounds[0].status = 'completed'
  await assert.rejects(
    __testables.submitBrewDoneItGuess(2, { body: { guessType: 'product', productId: 10 } }, response(), guesser),
    /not accepting guesses/
  )
  await assert.rejects(
    __testables.selectBrewDoneItProduct(2, { body: { productId: 10 } }, response(), selector),
    /cannot be changed/
  )
})

test('statistics are derived only from participant completed records', async () => {
  const records = installProvider()
  records.brew_done_it_games[0].status = 'completed'
  records.brew_done_it_rounds[0].status = 'completed'
  records.brew_done_it_rounds[0].awarded_points = 4
  records.brew_done_it_guesses.push(
    { round_id: 2, is_correct: true, awarded_points: 4 },
    { round_id: 2, is_correct: false, awarded_points: 900 }
  )
  const result = response()
  await __testables.brewDoneItStats(result, guesser)
  assert.deepEqual(result.body, { completedGames: 1, completedRounds: 1, awardedPoints: 4 })
})
