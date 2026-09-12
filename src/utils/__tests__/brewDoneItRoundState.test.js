import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeProjectedRoundGuess, solvedOutcomeReferences } from '../brewDoneItRoundState.js'

test('projected round guess merging preserves committed history and de-duplicates retries', () => {
  const current = {
    id: 1,
    guesses: [
      { id: 10, turn_sequence: 1, guess_type: 'brewery', guessed_producer_id: 5, is_correct: true }
    ]
  }
  const projected = { id: 1, version: 4, brewery_correct: true }
  const next = { id: 11, turn_sequence: 2, guess_type: 'style', guessed_category_id: 7, is_correct: false }

  const merged = mergeProjectedRoundGuess(current, projected, next)
  assert.equal(merged.version, 4)
  assert.deepEqual(merged.guesses.map((guess) => guess.id), [10, 11])

  const replayed = mergeProjectedRoundGuess(merged, { ...projected, version: 5 }, next)
  assert.deepEqual(replayed.guesses.map((guess) => guess.id), [10, 11])
})

test('solved outcome references derive exact beer brewery and style from the canonical candidate', () => {
  const round = {
    guesses: [
      { id: 1, guess_type: 'beer', guessed_product_id: 12, is_correct: true }
    ]
  }
  const references = solvedOutcomeReferences(round, [
    { id: 12, producerId: 4, categoryId: 9 },
    { id: 13, producerId: 5, categoryId: 10 }
  ])
  assert.deepEqual(references, { productId: '12', breweryId: '4', styleId: '9' })
})

test('solved outcome references use correct formal brewery and style guesses when beer is not solved', () => {
  const references = solvedOutcomeReferences({
    guesses: [
      { id: 1, guess_type: 'brewery', guessed_producer_id: '4', is_correct: '1' },
      { id: 2, guess_type: 'style', guessed_category_id: '9', is_correct: true },
      { id: 3, guess_type: 'beer', guessed_product_id: '12', is_correct: '0' }
    ]
  })
  assert.deepEqual(references, { productId: null, breweryId: '4', styleId: '9' })
})

test('incorrect formal guesses never become candidate constraints', () => {
  const references = solvedOutcomeReferences({
    guesses: [
      { id: 1, guess_type: 'brewery', guessed_producer_id: 4, is_correct: false },
      { id: 2, guess_type: 'style', guessed_category_id: 9, is_correct: 0 }
    ]
  })
  assert.deepEqual(references, { productId: null, breweryId: null, styleId: null })
})
