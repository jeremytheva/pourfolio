import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { inspectBrowserRelease } from '../check-browser-release-security.js'

const fixture = (files) => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-vercel-kv-'))
  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDirectory, filePath)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, content)
  }
  return rootDirectory
}

test('Vercel KV and Redis variable names remain server-only', (context) => {
  const rootDirectory = fixture({
    'src/kv.js': 'const a = process.env.pourfolio_KV_REST_API_TOKEN',
    'src/url.js': 'const b = process.env.pourfolio_KV_REST_API_URL',
    'dist/assets/redis.js': 'const c = "pourfolio_REDIS_URL"',
    'dist/assets/kv.js': 'const d = "pourfolio_KV_URL"',
    'dist/assets/read.js': 'const e = "pourfolio_KV_REST_API_READ_ONLY_TOKEN"'
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  assert.deepEqual(inspectBrowserRelease({ rootDirectory }), [
    'src/kv.js: exposes the server-only Vercel KV REST token variable name',
    'src/url.js: exposes the server-only Vercel KV REST URL variable name',
    'dist/assets/kv.js: exposes the server-only Vercel KV connection URL variable name',
    'dist/assets/read.js: exposes the server-only Vercel KV read-only token variable name',
    'dist/assets/redis.js: exposes the server-only Vercel Redis URL variable name'
  ])
})

test('configured Vercel KV values are detected without exposing their values in findings', (context) => {
  const values = {
    upstashToken: 'vercel-write-token-value',
    upstashUrl: 'https://vercel-kv.example.test',
    kvReadOnlyToken: 'vercel-read-token-value',
    kvUrl: 'redis://kv-user:kv-password@kv.example.test:6379',
    redisUrl: 'redis://redis-user:redis-password@redis.example.test:6379'
  }
  const rootDirectory = fixture({
    'dist/assets/config.js': `const values=${JSON.stringify(Object.values(values))}`
  })
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  const findings = inspectBrowserRelease({ rootDirectory, ...values })
  assert.equal(findings.length, 5)
  const output = findings.join('\n')
  for (const value of Object.values(values)) assert.equal(output.includes(value), false)
})
