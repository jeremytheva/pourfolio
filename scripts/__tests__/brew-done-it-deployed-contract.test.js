import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { DEPLOYED_COLLECTIONS, DEFERRED_COLLECTIONS } from '../../src/data/contract.js'

const contract = JSON.parse(fs.readFileSync(new URL('../../contracts/pourfolio-data-contract.json', import.meta.url), 'utf8'))

const brewCollections = {
  brewDoneItGames: 'brew_done_it_games',
  brewDoneItRounds: 'brew_done_it_rounds',
  brewDoneItGuesses: 'brew_done_it_guesses',
  brewDoneItDeductions: 'brew_done_it_deductions'
}

test('Brew Done It v3 collections are active deployed backend collections', () => {
  for (const [key, collection] of Object.entries(brewCollections)) {
    assert.equal(DEPLOYED_COLLECTIONS[key], collection)
    assert.equal(contract.collections[collection]?.classification, 'DEPLOYED_OPTIONAL')
  }
})

test('legacy Brew question persistence remains deferred', () => {
  assert.equal(DEFERRED_COLLECTIONS.brewDoneItQuestions, 'brew_done_it_questions')
  assert.equal(Object.values(brewCollections).includes(DEFERRED_COLLECTIONS.brewDoneItQuestions), false)
})

test('round provider contract contains the fields currently written by the v3 gateway', () => {
  const fields = new Set(contract.collections.brew_done_it_rounds.provider_fields)
  for (const field of [
    'game_id',
    'round_number',
    'selector_participant_id',
    'guesser_participant_id',
    'selected_product_id',
    'status',
    'turn_sequence',
    'max_turns',
    'question_count',
    'incorrect_formal_guess_count',
    'incorrect_guess_count',
    'brewery_correct',
    'beer_correct',
    'style_correct',
    'version',
    'pending_action_key',
    'pending_action_type',
    'pending_action_started_at',
    'last_action_key',
    'last_action_type',
    'round_creation_idempotency_key',
    'terminal_idempotency_key',
    'scoring_rules_version',
    'awarded_points',
    'score_breakdown',
    'completion_reason',
    'created_at',
    'started_at',
    'completed_at'
  ]) assert.ok(fields.has(field), `missing round field ${field}`)
})

test('deduction and formal-outcome lifecycle fields are deployed', () => {
  const guessFields = new Set(contract.collections.brew_done_it_guesses.provider_fields)
  const deductionFields = new Set(contract.collections.brew_done_it_deductions.provider_fields)

  for (const field of ['idempotency_key', 'action_state', 'committed_round_version']) {
    assert.ok(guessFields.has(field), `missing guess field ${field}`)
    assert.ok(deductionFields.has(field), `missing deduction field ${field}`)
  }
  assert.ok(deductionFields.has('observed_round_version'))
})
