import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE,
  bonusScoreFromPoints,
  categoryMatchesRatingKey,
  matchesBonusSearch,
  normaliseBonusSearchText,
  selectedBonusPointTotal,
  validateCustomBonusPointValue
} from './bonusAttributes.js'

test('bonus score is zero with no points, one below two points, and two from two points', () => {
  assert.equal(bonusScoreFromPoints(0), 0)
  assert.equal(bonusScoreFromPoints(0.1), 1)
  assert.equal(bonusScoreFromPoints(0.9), 1)
  assert.equal(bonusScoreFromPoints(1), 1)
  assert.equal(bonusScoreFromPoints(1.9), 1)
  assert.equal(bonusScoreFromPoints(2), 2)
  assert.equal(bonusScoreFromPoints(4.7), 2)
})

test('legacy null point values use the default without changing stored provider data', () => {
  assert.equal(BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE, 0.2)
  assert.equal(selectedBonusPointTotal([
    { id: 1, point_value: null },
    { id: 2, point_value: 0.5 }
  ], ['1', '2']), 0.7)
})

test('selected bonus attributes contribute only once even when an ID is repeated by category projections', () => {
  assert.equal(selectedBonusPointTotal([
    { id: 1, point_value: 0.4, category_keys: ['aroma', 'follow'] },
    { id: 2, point_value: 0.5, category_keys: ['overall'] }
  ], ['1', '1', '2']), 0.9)
})

test('custom point values are limited to 0.1 through 0.8 in 0.1 steps', () => {
  assert.equal(validateCustomBonusPointValue(0.1), 0.1)
  assert.equal(validateCustomBonusPointValue(0.2), 0.2)
  assert.equal(validateCustomBonusPointValue(0.8), 0.8)
  assert.throws(() => validateCustomBonusPointValue(0))
  assert.throws(() => validateCustomBonusPointValue(0.9))
  assert.throws(() => validateCustomBonusPointValue(0.25))
})

test('bonus categories match their rating cards using canonical names', () => {
  assert.equal(categoryMatchesRatingKey('Appearance', 'appearance'), true)
  assert.equal(categoryMatchesRatingKey('Appearence', 'appearance'), true)
  assert.equal(categoryMatchesRatingKey('Finish', 'follow'), true)
  assert.equal(categoryMatchesRatingKey('Overall', 'aroma'), false)
})

test('bonus search is case and punctuation insensitive with multi-word token matching', () => {
  assert.equal(normaliseBonusSearchText('  SSD (Smooth, Sweet!)  '), 'ssd smooth sweet')
  assert.equal(matchesBonusSearch('WET hops', 'Slap you in the face with bag of wet hops'), true)
  assert.equal(matchesBonusSearch('aroma pop', 'Aroma', 'Aroma Pop!'), true)
  assert.equal(matchesBonusSearch('smooth delicious', 'SSD (Smooth Sweet and Delicious!)'), true)
  assert.equal(matchesBonusSearch('finish aroma', 'Follow', 'Long finish'), false)
  assert.equal(matchesBonusSearch('', 'Any descriptor'), true)
})
