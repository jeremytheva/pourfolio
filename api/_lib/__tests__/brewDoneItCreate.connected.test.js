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
const runId = `brew-contract-${Date.now()}-${randomUUID()}`

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
  const creationKey = `${userId}:${runId}:${suffix}`
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
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  }
}

const roundPayload = (game, roundNumber, suffix = '') => ({
  user_id: userId,
  game_id: game.id,
  round_number: roundNumber,
  selector_participant_id: userId,
  guesser_participant_id: null,
  selected_product_id: productId,
  status: 'waiting_for_opponent',
  turn_sequence: 0,
  max_turns: 20,
  incorrect_guess_count: 0,
  incorrect_formal_guess_count: 0,
  brewery_correct: false,
  beer_correct: false,
  style_correct: false,
  version: 0,
  ...(suffix ? { round_creation_idempotency_key: `${userId}:${runId}:${suffix}` } : {})
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
  assert.deepEqual(failures, [], 'Brew Done It connected contract cleanup must remove every disposable fixture.')
})

contractTest('Brew Done It provider contract uses an explicit disposable environment', () => {
  requireContractEnvironment()
})

contractTest('challenge creation accepts the current v3 game and opening-round payloads', async () => {
  requireContractEnvironment()
  const game = remember('brew_done_it_games', await dataProvider.create('brew_done_it_games', gamePayload('create')))
  assert.ok(game?.id, 'Provider must return the created game identifier.')

  const round = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(game, 1)))
  assert.ok(round?.id, 'Provider must return the opening round identifier.')
  assert.equal(String(round.game_id), String(game.id))
  assert.equal(Number(round.round_number), 1)
})

contractTest('one participant can own multiple series and each series can contain repeated round numbers independently', async () => {
  requireContractEnvironment()
  const gameA = remember('brew_done_it_games', await dataProvider.create('brew_done_it_games', gamePayload('series-a')))
  const gameB = remember('brew_done_it_games', await dataProvider.create('brew_done_it_games', gamePayload('series-b')))
  assert.notEqual(String(gameA.id), String(gameB.id), 'creator_participant_id must not be globally unique.')

  const roundA = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(gameA, 1)))
  const roundB = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(gameB, 1)))
  assert.notEqual(String(roundA.id), String(roundB.id), 'round_number must be scoped to a game, not globally unique.')
})

contractTest('one series can persist more than one round', async () => {
  requireContractEnvironment()
  const game = remember('brew_done_it_games', await dataProvider.create('brew_done_it_games', gamePayload('multi-round')))
  const firstRound = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(game, 1)))
  const secondRound = remember('brew_done_it_rounds', await dataProvider.create('brew_done_it_rounds', roundPayload(game, 2, 'round-2')))
  assert.equal(String(firstRound.game_id), String(secondRound.game_id), 'game_id must support multiple child rounds.')
})
