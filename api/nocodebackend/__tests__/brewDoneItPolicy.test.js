import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { projectBrewDoneItRound } from '../../_lib/dataPolicy.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../data-proxy.js'

const originalProviderMethods = { ...dataProvider }
const originalPolicyFlag = process.env.BREW_DONE_IT_POLICY_ENABLED
afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
  if (originalPolicyFlag === undefined) delete process.env.BREW_DONE_IT_POLICY_ENABLED
  else process.env.BREW_DONE_IT_POLICY_ENABLED = originalPolicyFlag
})

const selector = { id: 'selector' }
const guesser = { id: 'guesser' }
const outsider = { id: 'outsider' }
const mutation = (body, expectedVersion = 0, idempotencyKey = 'test-idempotency-key-0001') => ({
  ...body, expectedVersion, idempotencyKey
})
const response = () => ({
  statusCode: null, body: null,
  status(code) { this.statusCode = code; return this },
  json(value) { this.body = value; return this }
})

test('every game gateway operation fails closed before data access while the policy flag is unset', async () => {
  delete process.env.BREW_DONE_IT_POLICY_ENABLED
  let providerCalls = 0
  for (const method of ['get', 'list', 'create', 'update', 'compareAndSet']) {
    dataProvider[method] = async () => {
      providerCalls += 1
      throw new Error('The disabled game must not access application data.')
    }
  }

  const operations = [
    ['POST', ['brew-done-it', 'games']],
    ['POST', ['brew-done-it', 'games', '1', 'join']],
    ['GET', ['brew-done-it', 'games', '1']],
    ['POST', ['brew-done-it', 'games', '1', 'cancel']],
    ['POST', ['brew-done-it', 'games', '1', 'expire']],
    ['POST', ['brew-done-it', 'games', '1', 'forfeit']],
    ['POST', ['brew-done-it', 'rounds', '2', 'selection']],
    ['POST', ['brew-done-it', 'rounds', '2', 'guesses']],
    ['POST', ['brew-done-it', 'rounds', '2', 'history-questions']],
    ['GET', ['brew-done-it', 'stats']]
  ]

  for (const [method, path] of operations) {
    const result = response()
    await __testables.routeRequest({ method, query: { path }, body: {} }, result, selector, 'test-correlation-id')
    assert.equal(result.statusCode, 404, `${method} ${path.join('/')} must be contained`)
    assert.deepEqual(result.body, { error: 'Application data route not found.' })
  }
  assert.equal(providerCalls, 0)
})

const installProvider = () => {
  const records = {
    [COLLECTIONS.brewDoneItGames]: [{
      id: 1, selector_participant_id: selector.id, guesser_participant_id: guesser.id,
      status: 'active', selector_history_consent_at: '2026-01-01T00:00:00.000Z',
      guesser_history_consent_at: '2026-01-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z'
    }],
    [COLLECTIONS.brewDoneItRounds]: [{
      id: 2, game_id: 1, round_number: 1, selector_participant_id: selector.id,
      guesser_participant_id: guesser.id, selected_product_id: '10', status: 'guessing',
      turn_sequence: 0, max_turns: 6, question_count: 0, started_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z'
    }],
    [COLLECTIONS.brewDoneItGuesses]: [],
    [COLLECTIONS.brewDoneItHistoryQuestions]: [],
    [COLLECTIONS.blockedRelationships]: [],
    [COLLECTIONS.ratings]: []
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
  dataProvider.compareAndSet = async (collection, id, expectedVersion, updates) => {
    const record = records[collection].find((candidate) => String(candidate.id) === String(id))
    if (Number(record.version || 0) !== Number(expectedVersion)) throw Object.assign(new Error('conflict'), { status: 409 })
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
    __testables.submitBrewDoneItGuess(2, { body: mutation({ guessType: 'product', productId: 10 }) }, response(), outsider),
    (error) => error.status === 404
  )
})

test('roles cannot be swapped for selection or guessing', async () => {
  installProvider()
  await assert.rejects(
    __testables.selectBrewDoneItProduct(2, { body: mutation({ productId: 10 }) }, response(), guesser),
    /Only the selector/
  )
  await assert.rejects(
    __testables.submitBrewDoneItGuess(2, { body: mutation({ guessType: 'product', productId: 10 }) }, response(), selector),
    /Only the designated guesser/
  )
})

test('owner, participant, turn, score and completion fields are ignored or server-derived', async () => {
  const records = installProvider()
  const result = response()
  await __testables.submitBrewDoneItGuess(2, { body: mutation({
    guessType: 'product', productId: 10, guesser_participant_id: outsider.id,
    turn_sequence: 99, awarded_points: 999, is_correct: false
  }) }, result, guesser)
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
    __testables.submitBrewDoneItGuess(2, { body: mutation({ guessType: 'product', productId: 11 }) }, response(), guesser),
    (error) => error.status === 409
  )
  records.brew_done_it_rounds[0].status = 'completed'
  await assert.rejects(
    __testables.submitBrewDoneItGuess(2, { body: mutation({ guessType: 'product', productId: 10 }) }, response(), guesser),
    /not accepting guesses/
  )
  await assert.rejects(
    __testables.selectBrewDoneItProduct(2, { body: mutation({ productId: 10 }) }, response(), selector),
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

test('shared-history predicates return only a boolean and ignore deleted and in-round ratings', async () => {
  const records = installProvider()
  records.ratings.push(
    { id: 1, user_id: selector.id, product_id: '10', date_rated: '2026-01-01T10:00:00.000Z' },
    { id: 2, user_id: guesser.id, product_id: '10', date_rated: '2026-01-01T11:00:00.000Z', deleted_at: '2026-01-01T12:00:00.000Z' },
    { id: 3, user_id: guesser.id, product_id: '10', date_rated: '2026-01-02T01:00:00.000Z' }
  )
  const result = response()
  await __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'both_rated_product' }) }, result, selector)
  assert.deepEqual(result.body, { predicate: 'both_rated_product', answer: false, version: 1 })
  assert.deepEqual(Object.keys(result.body).sort(), ['answer', 'predicate', 'version'])
})

test('shared-history rejects outsiders, guessed IDs, completed games and blocked participants', async () => {
  let records = installProvider()
  await assert.rejects(
    __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'both_rated_product' }) }, response(), outsider),
    (error) => error.status === 404
  )
  await assert.rejects(
    __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'both_rated_product', userId: guesser.id }) }, response(), selector),
    (error) => error.status === 400
  )
  records.brew_done_it_games[0].status = 'completed'
  records.brew_done_it_rounds[0].status = 'completed'
  await assert.rejects(
    __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'both_rated_product' }) }, response(), selector),
    (error) => error.status === 409
  )
  records = installProvider()
  records.blocked_relationships.push({ blocker_user_id: selector.id, blocked_user_id: guesser.id })
  await assert.rejects(
    __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'both_rated_product' }) }, response(), selector),
    (error) => error.status === 403
  )
})

test('the allowlist and per-round limit prevent private-history enumeration', async () => {
  const records = installProvider()
  await assert.rejects(
    __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'arbitrary_query' }) }, response(), selector),
    (error) => error.status === 400
  )
  records.brew_done_it_history_questions.push(
    { round_id: 2, predicate: 'both_rated_producer' },
    { round_id: 2, predicate: 'both_rated_style' }
  )
  await assert.rejects(
    __testables.resolveBrewDoneItHistoryQuestion(2, { body: mutation({ predicate: 'current_player_rated_product' }) }, response(), selector),
    /no remaining shared-history questions/
  )
})

test('a lost guess response can be retried without another turn or award', async () => {
  const records = installProvider()
  const request = { body: mutation({ guessType: 'product', productId: 10 }) }
  await __testables.submitBrewDoneItGuess(2, request, response(), guesser)
  const retried = response()
  await __testables.submitBrewDoneItGuess(2, request, retried, guesser)
  assert.equal(retried.statusCode, 200)
  assert.equal(retried.body.replayed, true)
  assert.equal(records.brew_done_it_guesses.length, 1)
  assert.equal(records.brew_done_it_rounds[0].awarded_points, 10)
})

test('two guesses for one version produce one winner and a safe stale conflict', async () => {
  const records = installProvider()
  await __testables.submitBrewDoneItGuess(2, {
    body: mutation({ guessType: 'product', productId: 11 }, 0, 'concurrent-guess-key-0001')
  }, response(), guesser)
  await assert.rejects(__testables.submitBrewDoneItGuess(2, {
    body: mutation({ guessType: 'producer', guessId: 30 }, 0, 'concurrent-guess-key-0002')
  }, response(), guesser), (error) => error.status === 409 && error.payload?.code === 'VERSION_CONFLICT')
  assert.equal(records.brew_done_it_guesses.length, 1)
  assert.equal(records.brew_done_it_rounds[0].version, 1)
})

test('forfeiture is terminal, versioned and idempotent', async () => {
  const records = installProvider()
  const request = { body: mutation({}, 0, 'forfeit-request-key-0001') }
  await __testables.transitionBrewDoneItGame(1, 'forfeit', request, response(), guesser)
  const replay = response()
  await __testables.transitionBrewDoneItGame(1, 'forfeit', request, replay, guesser)
  assert.equal(records.brew_done_it_games[0].status, 'forfeited')
  assert.equal(records.brew_done_it_rounds[0].status, 'forfeited')
  assert.equal(replay.body.replayed, true)
})

test('only overdue waiting invitations can expire', async () => {
  const records = installProvider()
  Object.assign(records.brew_done_it_games[0], {
    status: 'waiting', guesser_participant_id: null, expires_at: '2020-01-01T00:00:00.000Z'
  })
  await __testables.transitionBrewDoneItGame(1, 'expire', {
    body: mutation({}, 0, 'expiry-request-key-000001')
  }, response(), selector)
  assert.equal(records.brew_done_it_games[0].status, 'expired')
})

test('game reads isolate rounds belonging to a rematch game', async () => {
  const records = installProvider()
  records.brew_done_it_games.push({ ...records.brew_done_it_games[0], id: 9 })
  records.brew_done_it_rounds.push({ ...records.brew_done_it_rounds[0], id: 10, game_id: 9, round_number: 1 })
  const result = response()
  await __testables.showBrewDoneItGame(1, result, selector)
  assert.deepEqual(result.body.rounds.map((round) => round.id), [2])
})
