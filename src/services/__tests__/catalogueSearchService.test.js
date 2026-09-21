import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterVerifiedBreweries,
  filterVerifiedStyles,
  __testables
} from '../catalogueSearchService.js'

const breweries = [
  {
    producer: { id: 20, producer_name: 'Rocky Ridge Brewing', address: 'Katoomba NSW' },
    productCount: 4
  },
  {
    producer: { id: 30, producer_name: 'Coastal Ale Works', address: null },
    productCount: 2
  }
]

const styles = [
  { style: { id: 10, category_name: 'American Pale Ale' }, productCount: 6, breweryCount: 3 },
  { style: { id: 11, category_name: 'Imperial Stout' }, productCount: 2, breweryCount: 2 }
]

test('normalises search text deterministically', () => {
  assert.equal(__testables.normaliseSearchText('  Rocky   RIDGE  '), 'rocky ridge')
})

test('filters verified breweries by name or address without changing source rows', () => {
  assert.deepEqual(filterVerifiedBreweries(breweries, 'rocky ridge'), [breweries[0]])
  assert.deepEqual(filterVerifiedBreweries(breweries, 'katoomba'), [breweries[0]])
  assert.deepEqual(filterVerifiedBreweries(breweries, 'coastal'), [breweries[1]])
  assert.deepEqual(filterVerifiedBreweries(breweries, 'not present'), [])
  assert.deepEqual(filterVerifiedBreweries(breweries, '   '), [])
})

test('filters verified styles by canonical style name', () => {
  assert.deepEqual(filterVerifiedStyles(styles, 'pale ale'), [styles[0]])
  assert.deepEqual(filterVerifiedStyles(styles, 'STOUT'), [styles[1]])
  assert.deepEqual(filterVerifiedStyles(styles, 'lager'), [])
  assert.deepEqual(filterVerifiedStyles(styles, ''), [])
})
