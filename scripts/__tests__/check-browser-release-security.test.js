import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { inspectBrowserRelease } from '../check-browser-release-security.js'

const fixture = (files) => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-release-'))
  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDirectory, filePath)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, content)
  }
  return rootDirectory
}

test('accepts browser code that uses the same-origin authentication and data proxies', (context) => {
  const rootDirectory = fixture({
    'src/client.js': "fetch('/api/nocodebackend/auth/providers')",
    'src/products.js': "fetch('/api/nocodebackend/products?limit=20')",
    'dist/assets/client.js': "fetch('/api/nocodebackend/auth/sign-in/email')",
    'dist/assets/cellar.js': "fetch('/api/nocodebackend/cellar')"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrowserRelease({ rootDirectory }), [])
})

test('reports secret names, the configured data upstream and direct upstream auth requests', (context) => {
  const dataUpstream = 'https://private.invalid/database'
  const rootDirectory = fixture({
    'src/secret.js': "const key = 'NOCODEBACKEND_SECRET_KEY'",
    'src/config.js': "NOCODEBACKEND_DATA_BASE_URL='https://another.invalid/database'",
    'dist/assets/data.js': `fetch('${dataUpstream}/products')`,
    'dist/assets/auth.js': "fetch('https://app.nocodebackend.com/api/user-auth/providers')"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrowserRelease({ rootDirectory, dataUpstream }), [
    'src/config.js: contains a credential-like value',
    'src/secret.js: exposes the server-only secret variable name',
    'dist/assets/auth.js: requests the upstream authentication domain directly',
    'dist/assets/data.js: exposes the configured data upstream'
  ])
})

test('only exempts the explicit NoCodeBackend server proxy files and library', (context) => {
  const upstreamRequest = "fetch('https://app.nocodebackend.com/api/user-auth/providers')"
  const rootDirectory = fixture({
    'api/auth-proxy.js': upstreamRequest,
    'api/data-proxy.js': "const key = 'NOCODEBACKEND_SECRET_KEY'",
    'api/_lib/provider.js': "NOCODEBACKEND_DATA_BASE_URL='https://private.invalid/database'",
    'api/browser-client.js': upstreamRequest
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({ rootDirectory, browserDirectories: ['api'] }), [
    'api/browser-client.js: requests the upstream authentication domain directly'
  ])
})
