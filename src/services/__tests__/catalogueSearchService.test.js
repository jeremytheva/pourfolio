import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterVerifiedStyles,
  __testables
} from '../catalogueSearchService.js'

const styles = [
  { style: { id: 10, category_name: 'American Pale Ale' }, productCount: 6, breweryCount: 3 },
  { style: { id: 11, category_name: 'Imperial Stout' }, productCount: 2, breweryCount: 2 }
]

test('normalises search text deterministically', () => {
  assert.equal(__testables.normaliseSearchText('  Rocky   RIDGE  '), 'rocky ridge')
})

test('filters verified styles by canonical style name', () => {
  assert.deepEqual(filterVerifiedStyles(styles, 'pale ale'), [styles[0]])
  assert.deepEqual(filterVerifiedStyles(styles, 'STOUT'), [styles[1]])
  assert.deepEqual(filterVerifiedStyles(styles, 'lager'), [])
  assert.deepEqual(filterVerifiedStyles(styles, ''), [])
})
