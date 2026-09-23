import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('Brew Done It is exposed as an authenticated application route', () => {
  const app = read('src/App.jsx')
  assert.match(app, /lazy\(\(\) => import\('\.\/pages\/BrewDoneIt\.jsx'\)\)/)
  assert.match(app, /<Route path="\/brew-done-it" element=\{protect\(<BrewDoneItRoute user=\{user\} \/>\)\} \/>/)
  assert.match(app, /<BrewDoneIt(?: key=\{initialProductId \|\| 'brew-done-it'\})? user=\{user\} initialProductId=\{initialProductId\} \/>/)
})

test('Brew Done It appears in authenticated primary navigation', () => {
  const layout = read('src/components/MainLayout.jsx')
  assert.match(layout, /to: '\/brew-done-it', label: 'Brew Done It'/)
  assert.match(layout, /pathname === '\/brew-done-it'/)
})

test('Brew Done It backend requires explicit policy enablement', () => {
  const gateway = read('api/_lib/brewDoneItEntryV3.js')
  assert.match(gateway, /BREW_DONE_IT_POLICY_ENABLED/)
  assert.match(gateway, /toLowerCase\(\) === 'true'/)
  assert.doesNotMatch(gateway, /toLowerCase\(\) !== 'false'/)
})
