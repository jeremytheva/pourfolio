import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (relativePath) => readFile(new URL(`../../../${relativePath}`, import.meta.url), 'utf8')

test('browser API client remains on the same-origin Pourfolio proxy', async () => {
  const source = await read('src/lib/nocodeBackend.js')

  assert.match(source, /const DATA_API_BASE_URL = ['"]\/api\/nocodebackend['"]/)
  assert.match(source, /const AUTH_API_BASE_URL = ['"]\/api\/nocodebackend\/auth['"]/)
  assert.doesNotMatch(source, /lambda-url\./)
  assert.doesNotMatch(source, /\/read\/|\/create\/|\/update\/|\/delete\//)
})

test('cellar service uses the owner-scoped semantic gateway', async () => {
  const source = await read('src/services/cellarService.js')

  assert.match(source, /apiRequest\(['"]\/cellar['"]\)/)
  assert.match(source, /apiRequest\(`\/cellar\/\$\{encodeURIComponent\(id\)\}`/)
  assert.doesNotMatch(source, /cellar_items_pf2025|\/read\/|\/create\/|\/update\/|\/delete\//)
})

test('plain Vite previews proxy API requests only through a configured Pourfolio API target', async () => {
  const source = await read('vite.config.js')

  assert.match(source, /POURFOLIO_API_PROXY_TARGET/)
  assert.match(source, /['"]\/api['"]/)
  assert.match(source, /cookieDomainRewrite:\s*['"]['"]/)
  assert.match(source, /preview_api_unconfigured/)
})
