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

test('reports each server-only rate-limit variable name in browser source', (context) => {
  const rootDirectory = fixture({
    'src/token.js': "process.env.UPSTASH_REDIS_REST_TOKEN",
    'dist/assets/secret.js': "globalThis.RATE_LIMIT_KEY_SECRET"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({ rootDirectory }), [
    'src/token.js: exposes the server-only Upstash token variable name',
    'dist/assets/secret.js: exposes the server-only rate-limit secret variable name'
  ])
})

test('reports configured Upstash and rate-limit values in browser output', (context) => {
  const rootDirectory = fixture({
    'dist/assets/config.js': "const values = ['redis-token-value', 'bucket-secret-value', 'https://redis-private.example.test']"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({
    rootDirectory,
    upstashToken: 'redis-token-value',
    rateLimitSecret: 'bucket-secret-value',
    upstashUrl: 'https://redis-private.example.test'
  }), [
    'dist/assets/config.js: exposes the configured Upstash token',
    'dist/assets/config.js: exposes the configured rate-limit secret',
    'dist/assets/config.js: exposes the configured Upstash URL'
  ])
})

test('reports Upstash browser imports and direct REST requests', (context) => {
  const rootDirectory = fixture({
    'src/redis.js': "import { Redis } from '@upstash/redis'",
    'dist/assets/request.js': "fetch('https://alert-cobra-12345.upstash.io/get/key')"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({ rootDirectory }), [
    'src/redis.js: imports @upstash/redis in browser code',
    'dist/assets/request.js: makes a direct Upstash REST request'
  ])
})

test('allows rate-limit implementation fixtures under api/_lib', (context) => {
  const rootDirectory = fixture({
    'api/_lib/redis.js': "import { Redis } from '@upstash/redis'; fetch('https://server-only.upstash.io')",
    'api/_lib/rateLimit.js': "const secret = process.env.RATE_LIMIT_KEY_SECRET",
    'api/_lib/config.js': "const token = process.env.UPSTASH_REDIS_REST_TOKEN"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({ rootDirectory, browserDirectories: ['api'] }), [])
})

test('does not treat .env.example placeholders as configured secrets', (context) => {
  const rootDirectory = fixture({
    '.env.example': 'UPSTASH_REDIS_REST_URL=\nUPSTASH_REDIS_REST_TOKEN=\nRATE_LIMIT_KEY_SECRET=\n',
    'src/client.js': "fetch('/api/nocodebackend/products')"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({
    rootDirectory,
    upstashToken: 'replace-me',
    rateLimitSecret: '${RATE_LIMIT_KEY_SECRET}',
    upstashUrl: 'https://example.com'
  }), [])
})
