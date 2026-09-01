import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const errorBoundary = readFileSync(new URL('../src/components/ErrorBoundary.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('global error recovery uses pathname routing and accessible focus semantics', () => {
  assert.match(errorBoundary, /window\.location\.assign\('\/home'\)/)
  assert.doesNotMatch(errorBoundary, /#\/home/)
  assert.match(errorBoundary, /role="alert"/)
  assert.match(errorBoundary, /tabIndex=\{-1\}/)
  assert.match(errorBoundary, /errorRegionRef\.current\?\.focus\(\)/)
  assert.doesNotMatch(errorBoundary, /your data is safe/i)
})

test('global loading state exposes one atomic status with a decorative spinner', () => {
  assert.match(app, /role="status"/)
  assert.match(app, /aria-atomic="true"/)
  assert.match(app, /aria-hidden="true"/)
  assert.match(app, /Loading Pourfolio…/)
  assert.match(app, /Try again, or return home\./)
})
