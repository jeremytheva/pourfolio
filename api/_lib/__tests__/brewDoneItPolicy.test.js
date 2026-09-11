import assert from 'node:assert/strict'
import test from 'node:test'
import {
  projectBrewDoneItGame,
  projectBrewDoneItGuess,
  projectBrewDoneItRound,
  sanitiseBrewDoneItDeductionInput,
  sanitiseBrewDoneItGuessInput,
  sanitiseBrewDoneItQuestionInput
} from '../brewDoneItPolicy.js'

test('guesser projection never receives the secret beer before a round ends', () => {
  const round = {
    id: 11,
    game_id: 5,
    selector_participant_id: 'selector',
    guesser_participant_id: 'guesser',
    selected_product_id: 123,
    status: 'guessing',
    turn_sequence: 2,
    max_turns: 20,
    question_count: 1,
    incorrect_guess_count: 1,
    version: 2
  }

  assert.equal(projectBrewDoneItRound(round, 'guesser').selected_product_id, undefined)
  assert.equal(projectBrewDoneItRound(round, 'selector').selected_product_id, 123)
})

test('secret beer is revealed to both participants after completion', () => {
  const round = {
    id: 11,
    selector_participant_id: 'selector',
    guesser_participant_id: 'guesser',
    selected_product_id: 123,
    status: 'completed'
  }
  assert.equal(projectBrewDoneItRound(round, 'guesser').selected_product_id, 123)
})

test('provider boolean-like values are normalised before browser projection', () => {
  const game = projectBrewDoneItGame({
    id: 1,
    creator_history_clues_enabled: '0',
    opponent_history_clues_enabled: '1'
  })
  assert.equal(game.creator_history_clues_enabled, false)
  assert.equal(game.opponent_history_clues_enabled, true)

  const round = projectBrewDoneItRound({
    id: 2,
    selector_participant_id: 'selector',
    guesser_participant_id: 'guesser',
    status: 'guessing',
    brewery_correct: '0',
    style_correct: '1',
    beer_correct: 0
  }, 'guesser')
  assert.equal(round.brewery_correct, false)
  assert.equal(round.style_correct, true)
  assert.equal(round.beer_correct, false)

  assert.equal(projectBrewDoneItGuess({ id: 3, is_correct: '0' }).is_correct, false)
  assert.equal(projectBrewDoneItGuess({ id: 4, is_correct: '1' }).is_correct, true)
})

test('v3 deduction input keeps only fields appropriate to each dimension', () => {
  assert.deepEqual(
    sanitiseBrewDoneItDeductionInput({
      dimension: 'collaboration',
      answer: 'yes',
      referenceId: 99,
      numericValue: 5,
      valueText: 'ignored'
    }),
    { dimension: 'collaboration', answer: 'yes', valueText: null, referenceId: null, numericValue: null }
  )

  assert.deepEqual(
    sanitiseBrewDoneItDeductionInput({ dimension: 'beer_ruled_out', answer: 'yes', referenceId: 42 }),
    { dimension: 'beer_ruled_out', answer: 'yes', valueText: null, referenceId: '42', numericValue: null }
  )
})

test('base game guesses accept only a catalogue beer identifier', () => {
  assert.deepEqual(sanitiseBrewDoneItGuessInput({ productId: 42 }), { productId: '42' })
  assert.throws(() => sanitiseBrewDoneItGuessInput({ guessType: 'producer', guessId: 4 }), /Product identifier/)
})

test('catalogue questions are controlled and reject arbitrary question text', () => {
  assert.deepEqual(
    sanitiseBrewDoneItQuestionInput({ questionType: 'producer', referenceId: 8 }),
    { questionType: 'producer', referenceId: '8', threshold: null }
  )
  assert.deepEqual(
    sanitiseBrewDoneItQuestionInput({ questionType: 'abv_at_least', threshold: 7 }),
    { questionType: 'abv_at_least', referenceId: null, threshold: 7 }
  )
  assert.throws(
    () => sanitiseBrewDoneItQuestionInput({ questionType: 'free_text', question: 'What is it?' }),
    /Question type is invalid/
  )
})