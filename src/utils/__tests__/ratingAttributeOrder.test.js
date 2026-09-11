import assert from 'node:assert/strict'
import test from 'node:test'
import { RATING_ATTRIBUTE_DISPLAY_ORDER, sortRatingAttributes } from '../ratingAttributeOrder.js'

test('sortRatingAttributes applies the canonical beer rating display order', () => {
  const attributes = [
    { id: 8, attribute_name: 'Burp' },
    { id: 5, attribute_name: 'Flavour' },
    { id: 2, attribute_name: 'Appearance' },
    { id: 7, attribute_name: 'Bonus' },
    { id: 3, attribute_name: 'Aroma' },
    { id: 6, attribute_name: 'Follow' },
    { id: 1, attribute_name: 'Design' },
    { id: 4, attribute_name: 'Mouthfeel' }
  ]

  const sorted = sortRatingAttributes(attributes)

  assert.deepEqual(sorted.map((attribute) => attribute.attribute_name), RATING_ATTRIBUTE_DISPLAY_ORDER)
  assert.deepEqual(attributes.map((attribute) => attribute.id), [8, 5, 2, 7, 3, 6, 1, 4])
})

test('sortRatingAttributes recognises current data aliases and preserves unknown attribute order', () => {
  const attributes = [
    { id: 90, name: 'Custom one' },
    { id: 4, name: 'Mouthwash' },
    { id: 2, name: 'Appearence' },
    { id: 91, name: 'Custom two' },
    { id: 1, name: 'Package Design' },
    { id: 6, name: 'Follow (Finish)' }
  ]

  assert.deepEqual(
    sortRatingAttributes(attributes).map((attribute) => attribute.id),
    [1, 2, 4, 6, 90, 91]
  )
})
