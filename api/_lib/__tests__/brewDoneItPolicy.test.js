import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sanitiseBrewDoneItGuessInput,
  sanitiseBrewDoneItQuestionInput,
  projectBrewDoneItRound
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
