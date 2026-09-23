import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'

const enabled = process.env.RUN_BREW_DONE_IT_PROVIDER_CONTRACT === '1'
const contractTest = enabled ? test : test.skip
const requiredEnvironment = [
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE',
  'BREW_DONE_IT_CONTRACT_ENVIRONMENT',
  'BREW_DONE_IT_CONTRACT_ALLOW_DESTRUCTIVE',
  'BREW_DONE_IT_CONTRACT_USER_ID',
  'BREW_DONE_IT_CONTRACT_PRODUCT_ID'
]

const created = []
const userId = process.env.BREW_DONE_IT_CONTRACT_USER_ID
const productId = process.env.BREW_DONE_IT_CONTRACT_PRODUCT_ID
const runId = `brew-child-contract-${Date.now()}-${randomUUID()}`
const now = () => new Date().toISOString()
const first = (value) => Array.isArray(value) ? value[0] : value
const remember = (collection, value) => {
  const record = first(value)
  if (record?.id !== undefined && record?.id !== null) created.push([collection, record.id])
  return record
}

const requireContractEnvironment = () => {
  const missing = requiredEnvironment.filter((key) => !process.env[key])
  assert.deepEqual(missing, [], `Missing Brew Done It connected contract environment: ${missing.join(', ')}`)
  assert.equal(process.env.BREW_DONE_IT_CONTRACT_ENVIRONMENT, 'isolated-staging')
  assert.equal(process.env.BREW_DONE_IT_CONTRACT_ALLOW_DESTRUCTIVE, '1')
  assert.match(String(userId), /\S/)
  assert.match(String(productId), /^[1-9]\d*$/)
}

const gamePayload = (suffix) => {
  const creationKey = `${userId}:${runId}:game:${suffix}`
  return {
    user_id: userId,
    creator_participant_id: userId,
    opponent_participant_id: null,
    creator_history_clues_enabled: false,
    opponent_history_clues_enabled: false,
    invitation_digest: createHash('sha256').update(`${creationKey}:invite`).digest('hex'),
    status: 'waiting',
    current_round_number: 1,
    version: 0,
    creation_idempotency_key: creationKey,
    creation_request_fingerprint: createHash('sha256').update(`${creationKey}:${productId}`).digest('hex'),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    created_at: now(),
    last_activity_at: now()
  }
}

const roundPayload = (game) => ({
  user_id: userId,
  game_id: game.id,
  round_number: 1,
  selector_participant_id: userId,
  guesser_participant_id: userId,
  selected_product_id: productId,
  status: 'guessing',
  turn_sequence: 0,
  max_turns: 20,
  incorrect_guess_count: 0,
  incorrect_formal_guess_count: 0,
  brewery_correct: false,
  beer_correct: false,
  style_correct: false,
  version: 0,
  created_at: now(),
  started_at: now()
})

const guessPayload = (round, sequence, suffix) => ({
  user_id: userId,
  round_id: round.id,
  turn_sequence: sequence,
  guess_type: 'beer',
  guessed_product_id: productId,
  guesser_participant_id: userId,
  is_correct: false,
  idempotency_key: `${userId}:${runId}:guess:${suffix}`,
  action_state: 'committed',
  committed_round_version: sequence,
  created_at: now()
})

const deductionPayload = (round, answer, suffix) => ({
  user_id: userId,
  round_id: round.id,
  recorded_by_participant_id: userId,
  dimension: 'collaboration',
  answer,
  idempotency_key: `${userId}:${runId}:deduction:${suffix}`,
  observed_round_version: 0,
  action_state: 'committed',
  committed_round_version: 0,
  created_at: now(),
  updated_at: now()
})

test.after(async () => {
  if (!enabled) return
  const failures = []
  for (const [collection, id] of created.reverse()) {
    try {
      await dataProvider.remove(collection, id)
    } catch (error) {
      failures.push({ collection, status: error?.status ?? null, code: error?.code ?? 'CLEANUP_FAILED' })
    }
  }
  assert.deepEqual(failures, [], 'Brew Done It connected child-cardinality cleanup must remove every disposable fixture.')
})

contractTest('formal outcomes allow multiple child rows for one round', async () => {
  requireContractEnvironment()
  const game = remember('brew_done_it_games', await dataProvider.create('brew_done_it_games', gamePayload('guesses')))
  const round = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(game)))
  const firstGuess = remember('brew_done_it_guesses', await dataProvider.create('brew_done_it_guesses', guessPayload(round, 1, 'one')))
  const secondGuess = remember('brew_done_it_guesses', await dataProvider.create('brew_done_it_guesses', guessPayload(round, 2, 'two')))

  assert.equal(String(firstGuess.round_id), String(round.id))
  assert.equal(String(secondGuess.round_id), String(round.id), 'round_id must not be globally unique in brew_done_it_guesses.')
  assert.notEqual(String(firstGuess.id), String(secondGuess.id))
})

contractTest('deduction history allows multiple events from one guesser in one round', async () => {
  requireContractEnvironment()
  const game = remember('brew_done_it_games', await dataProvider.create('brew_done_it_games', gamePayload('deductions')))
  const round = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(game)))
  const firstDeduction = remember('brew_done_it_deductions', await dataProvider.create('brew_done_it_deductions', deductionPayload(round, 'yes', 'one')))
  const secondDeduction = remember('brew_done_it_deductions', await dataProvider.create('brew_done_it_deductions', deductionPayload(round, 'unknown', 'two')))

  assert.equal(String(firstDeduction.round_id), String(round.id))
  assert.equal(String(secondDeduction.round_id), String(round.id), 'round_id must not be globally unique in brew_done_it_deductions.')
  assert.equal(String(firstDeduction.recorded_by_participant_id), String(secondDeduction.recorded_by_participant_id), 'recorded_by_participant_id must support append-only events.')
  assert.notEqual(String(firstDeduction.id), String(secondDeduction.id))
})
