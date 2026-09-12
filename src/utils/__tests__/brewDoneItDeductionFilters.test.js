import assert from 'node:assert/strict'
import test from 'node:test'
import { filterBrewDoneItBeers, filterBrewDoneItBreweries, filterBrewDoneItStyles } from '../brewDoneItDeductionFilters.js'

const beers = [
  { id: 1, producerId: 10, categoryId: 100, abv: 6.5, ibu: 50, collaboration: true },
  { id: 2, producerId: 20, categoryId: 200, abv: 4.5, ibu: 20, collaboration: false },
  { id: 3, producerId: null, categoryId: null, abv: null, ibu: null, collaboration: null }
]

test('unknown beer facts survive both yes and no deductions', () => {
  const breweryIds = new Set(['10', '20'])
  const yes = filterBrewDoneItBeers(beers, [
    { dimension: 'abv_at_least', answer: 'yes', numeric_value: 6 },
    { dimension: 'collaboration', answer: 'yes' }
  ], breweryIds)
  assert.deepEqual(yes.map((beer) => beer.id), [1, 3])

  const no = filterBrewDoneItBeers(beers, [
    { dimension: 'abv_at_least', answer: 'no', numeric_value: 6 },
    { dimension: 'collaboration', answer: 'no' }
  ], breweryIds)
  assert.deepEqual(no.map((beer) => beer.id), [2, 3])
})

test('known contradictory beer facts are eliminated', () => {
  const result = filterBrewDoneItBeers(beers, [
    { dimension: 'style', answer: 'yes', reference_id: 100 },
    { dimension: 'ibu_at_least', answer: 'yes', numeric_value: 40 }
  ], new Set(['10', '20']))
  assert.deepEqual(result.map((beer) => beer.id), [1, 3])
})

test('dark and barrel-aged notes do not automatically filter candidates', () => {
  const result = filterBrewDoneItBeers(beers, [
    { dimension: 'dark', answer: 'yes' },
    { dimension: 'barrel_aged', answer: 'no' }
  ], new Set(['10', '20']))
  assert.deepEqual(result.map((beer) => beer.id), [1, 2, 3])
})

test('missing brewery attribution remains possible after brewery narrowing', () => {
  const result = filterBrewDoneItBeers(beers, [], new Set(['10']))
  assert.deepEqual(result.map((beer) => beer.id), [1, 3])
})

test('zero remaining known breweries does not restore beers from ruled-out known breweries', () => {
  const result = filterBrewDoneItBeers(
    beers,
    [],
    new Set(),
    new Set(['10', '20'])
  )
  assert.deepEqual(result.map((beer) => beer.id), [3])
})

test('positive producer ids without a governed brewery row remain unknown candidates', () => {
  const catalogue = [
    ...beers,
    { id: 4, producerId: 999, categoryId: 100, abv: 5.5, ibu: 30, collaboration: false }
  ]
  const result = filterBrewDoneItBeers(
    catalogue,
    [],
    new Set(['10']),
    new Set(['10', '20'])
  )
  assert.deepEqual(result.map((beer) => beer.id), [1, 3, 4])
})

test('explicit beer exclusions remove only the selected candidate', () => {
  const result = filterBrewDoneItBeers(beers, [
    { dimension: 'beer_ruled_out', answer: 'yes', reference_id: 2 }
  ], new Set(['10', '20']))
  assert.deepEqual(result.map((beer) => beer.id), [1, 3])
})

test('unknown beer categories keep all styles possible', () => {
  const styles = [{ id: 100 }, { id: 200 }, { id: 300 }]
  assert.deepEqual(filterBrewDoneItStyles(styles, [beers[0], beers[2]]), styles)
})

test('styles narrow only when every remaining beer has a known category', () => {
  const styles = [{ id: 100 }, { id: 200 }, { id: 300 }]
  const result = filterBrewDoneItStyles(styles, [beers[0], beers[1]])
  assert.deepEqual(result.map((style) => style.id), [100, 200])
})

test('unavailable geography does not eliminate breweries', () => {
  const breweries = [
    { id: 10, state: null, country: null, previouslyRated: true },
    { id: 20, state: null, country: null, previouslyRated: false }
  ]
  const result = filterBrewDoneItBreweries(breweries, [
    { dimension: 'brewery_state', answer: 'yes', value_text: 'NSW' }
  ], { geographyAvailable: false })
  assert.equal(result.length, 2)
})

test('previously-rated brewery relationship narrows known brewery candidates but preserves unknown ones', () => {
  const breweries = [
    { id: 10, previouslyRated: true },
    { id: 20, previouslyRated: false },
    { id: 30, previouslyRated: null }
  ]
  const result = filterBrewDoneItBreweries(breweries, [
    { dimension: 'brewery_previously_rated', answer: 'no' }
  ])
  assert.deepEqual(result.map((brewery) => brewery.id), [20, 30])
})

test('explicit brewery exclusions remove only the selected candidate', () => {
  const breweries = [
    { id: 10, previouslyRated: true },
    { id: 20, previouslyRated: false }
  ]
  const result = filterBrewDoneItBreweries(breweries, [
    { dimension: 'brewery_ruled_out', answer: 'yes', reference_id: 10 }
  ])
  assert.deepEqual(result.map((brewery) => brewery.id), [20])
})
