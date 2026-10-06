import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('Brew Done It remains contained behind an informational authenticated route', () => {
  const app = read('src/App.jsx')
  assert.doesNotMatch(app, /lazy\(\(\) => import\('\.\/pages\/BrewDoneIt\.jsx'\)\)/)
  assert.match(app, /lazy\(\(\) => import\('\.\/pages\/ProductRoadmap\.jsx'\)\)/)
  assert.match(app, /<Route path="\/brew-done-it" element=\{protect\(<ProductRoadmap focus="brew-done-it" \/>\)\} \/>/)
  assert.doesNotMatch(app, /<BrewDoneIt/)
})

test('Brew Done It is absent from primary navigation and planned features are discoverable', () => {
  const layout = read('src/components/MainLayout.jsx')
  assert.doesNotMatch(layout, /to: '\/brew-done-it', label: 'Brew Done It'/)
  assert.match(layout, /to: '\/features', label: 'Coming soon'/)
  assert.match(layout, /pathname === '\/brew-done-it'/)
  assert.match(layout, /pathname === '\/features'/)
})

test('product UI labels Brew Done It as planned and links only to the status route', () => {
  const details = read('src/pages/BeerDetails.jsx')
  assert.match(details, />Brew Done It · Planned<\/Link>/)
  assert.match(details, /to="\/brew-done-it"/)
  assert.doesNotMatch(details, /state=\{\{ initialProductId:/)
  assert.doesNotMatch(details, />Play Brew-Done-It<\/Link>/)
})

test('Brew Done It backend requires explicit policy enablement', () => {
  const gateway = read('api/_lib/brewDoneItEntryV3.js')
  assert.match(gateway, /BREW_DONE_IT_POLICY_ENABLED/)
  assert.match(gateway, /toLowerCase\(\) === 'true'/)
  assert.doesNotMatch(gateway, /toLowerCase\(\) !== 'false'/)
})
