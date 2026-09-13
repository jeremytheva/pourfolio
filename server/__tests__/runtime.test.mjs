import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apiRoute,
  buildQuery,
  safeDistPath,
  securityHeaders
} from '../runtime.mjs'

test('buildQuery preserves repeated query parameters', () => {
  const url = new URL('https://example.test/path?one=1&many=a&many=b')
  const query = buildQuery(url)

  assert.equal(query.one, '1')
  assert.deepEqual(query.many, ['a', 'b'])
})

test('apiRoute maps public API paths to the existing handlers', () => {
  assert.equal(typeof apiRoute('/api/health')?.handler, 'function')
  assert.equal(typeof apiRoute('/api/readiness')?.handler, 'function')
  assert.equal(apiRoute('/api/nocodebackend/auth/sign-in/email')?.path, 'sign-in/email')
  assert.equal(apiRoute('/api/nocodebackend/catalog/products')?.path, 'catalog/products')
  assert.equal(apiRoute('/api/data-proxy'), null)
})

test('safeDistPath prevents traversal outside the generated build', () => {
  assert.ok(safeDistPath('/assets/app.js')?.endsWith('dist/assets/app.js'))
  assert.equal(safeDistPath('/../package.json'), null)
  assert.equal(safeDistPath('/%2e%2e/package.json'), null)
})

test('host-neutral runtime keeps the production security header contract', () => {
  assert.match(securityHeaders['Content-Security-Policy'], /connect-src 'self'/)
  assert.equal(securityHeaders['X-Frame-Options'], 'DENY')
  assert.equal(securityHeaders['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains; preload')
})
