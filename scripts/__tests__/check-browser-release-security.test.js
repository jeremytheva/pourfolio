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

test('accepts browser code that uses only the same-origin authentication proxy', (context) => {
  const rootDirectory = fixture({
    'src/client.js': "fetch('/api/nocodebackend/auth/providers')",
    'dist/assets/client.js': "fetch('/api/nocodebackend/auth/sign-in/email')"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrowserRelease({ rootDirectory }), [])
})

test('reports secret names, real credential values and direct upstream auth requests', (context) => {
  const rootDirectory = fixture({
    'src/secret.js': "const key = 'NOCODEBACKEND_SECRET_KEY'",
    'src/config.js': "NOCODEBACKEND_DATA_BASE_URL='https://private.invalid/database'",
    'dist/assets/auth.js': "fetch('https://app.nocodebackend.com/api/user-auth/providers')"
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrowserRelease({ rootDirectory }), [
    'src/config.js: contains a credential-like value',
    'src/secret.js: exposes the server-only secret variable name',
    'dist/assets/auth.js: requests the upstream authentication domain directly'
  ])
})
