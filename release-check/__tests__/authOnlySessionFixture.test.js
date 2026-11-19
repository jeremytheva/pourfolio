import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

test('actual API-only case keeps auth, original-cookie teardown and primary context disposal isolated', { timeout: 90000 }, () => {
  const require = createRequire(import.meta.url)
  const packageDirectory = path.dirname(require.resolve('@playwright/test/package.json'))
  const source = fs.readFileSync(new URL('../auth-only.spec.js', import.meta.url), 'utf8')
  const boundary = source.indexOf('// One API-only case;')
  assert.ok(boundary > 0)
  assert.ok(source.includes('timeout: 120_000'))
  const prefix = source.slice(0, boundary)
    .replace("import { test as base } from '@playwright/test'",
      'import playwrightModule from ' + JSON.stringify(pathToFileURL(require.resolve('@playwright/test')).href) + '\nconst { test: base } = playwrightModule')
    .replace("from '../src/hooks/useAuth.js'", 'from ' + JSON.stringify(new URL('../../src/hooks/useAuth.js', import.meta.url).href))
    .replace("from './support.js'", 'from ' + JSON.stringify(new URL('../support.js', import.meta.url).href))
    .replace("from './releaseTarget.js'", 'from ' + JSON.stringify(new URL('../releaseTarget.js', import.meta.url).href))
    .replace('const test = base.extend', 'const authTest = base.extend')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-auth-only-fixture-'))
  const directory = path.join(root, 'release-check')
  const eventsPath = path.join(root, 'events.jsonl')
  const outcomePath = path.join(root, 'outcome.json')
  const canary = 'synthetic-private-auth-cookie-password-error'
  const origin = 'https://brew-buds-mobile-app-design-3577.vercel.app'
  const scenarios = ['success', 'partial', 'primary-and-cleanup', 'session-rejected', 'wrong-email',
    'duplicate-identity', 'logout-failure', 'probe200', 'primary-dispose', 'missing-credentials',
    'invalid-origin', 'source-mismatch', 'unexpected-confirmation', 'skip']
  try {
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}', { mode: 0o600 })
    const overrides = `
import fs from 'node:fs'
import assert from 'node:assert/strict'
const scenario = process.env.AUTH_FIXTURE_SCENARIO
const canary = ${JSON.stringify(canary)}
const origin = ${JSON.stringify(origin)}
const event = value => fs.appendFileSync(${JSON.stringify(eventsPath)}, JSON.stringify(value) + '\\n', { mode: 0o600 })
const cookie = (account, stage) => ({ name: 'session', value: account + ':' + stage + ':' + canary,
  domain: new URL(origin).hostname, path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' })
globalThis.fetch = async () => { throw new Error('LIVE_NETWORK_FORBIDDEN') }
const test = authTest.extend({
  playwright: [async ({ playwright }, use) => {
    let primaries = 0
    const factory = async options => {
      assert.equal(options.baseURL, origin)
      if (options.storageState) {
        const original = options.storageState.cookies[0]
        assert.ok(original.value.endsWith(':' + canary))
        const [account, stage] = original.value.split(':')
        event({ account, stage, action: 'cleanup-context' })
        return {
          post: async (url, init) => {
            assert.equal(url, origin + '/api/nocodebackend/auth/sign-out')
            assert.deepEqual(init.data, {})
            assert.equal(init.maxRetries, 0); assert.equal(init.maxRedirects, 0)
            assert.equal(init.timeout, 4000); assert.equal(init.headers.Origin, origin)
            event({ account, stage, action: 'logout' })
            options.storageState.cookies[0].value = 'cleared'
            if (['logout-failure', 'primary-and-cleanup'].includes(scenario) && account === 'owner' && stage === 'signin') throw new Error(canary)
            return { status: () => 200 }
          },
          get: async (url, init) => {
            assert.equal(url, origin + '/api/nocodebackend/auth/get-session')
            assert.equal(init.maxRetries, 0); assert.equal(init.maxRedirects, 0)
            assert.equal(init.timeout, 4000); assert.equal(init.headers.Origin, origin)
            assert.equal(options.storageState.cookies[0].value, cookie(account, stage).value)
            event({ account, stage, action: 'probe' })
            return { status: () => scenario === 'probe200' && account === 'owner' ? 200 : 401 }
          },
          dispose: async () => event({ account, stage, action: 'cleanup-dispose' })
        }
      }
      const account = primaries++ === 0 ? 'owner' : 'other'
      assert.ok(primaries <= 2)
      assert.equal(options.timeout, 15000)
      event({ account, action: 'primary-context' })
      let cookies = []
      return {
        post: async (url, init) => {
          assert.equal(url, origin + '/api/nocodebackend/auth/sign-in/email')
          assert.deepEqual(init.data, { email: account + '@example.invalid', password: canary })
          assert.equal(init.maxRetries, 0); assert.equal(init.maxRedirects, 0)
          assert.equal(init.timeout, 15000); assert.equal(init.headers.Origin, origin)
          cookies = [cookie(account, 'signin')]
          event({ account, action: 'signin' })
          if (['partial', 'primary-and-cleanup'].includes(scenario) && account === 'owner') throw new Error(canary)
          return { status: () => 200 }
        },
        get: async (url, init) => {
          assert.equal(url, origin + '/api/nocodebackend/auth/get-session')
          assert.equal(init.maxRetries, 0); assert.equal(init.maxRedirects, 0)
          assert.equal(init.timeout, 15000); assert.equal(init.headers.Origin, origin)
          cookies = [cookie(account, 'session')]
          event({ account, action: 'session' })
          return { status: () => scenario === 'session-rejected' && account === 'owner' ? 500 : 200,
            body: async () => Buffer.from(JSON.stringify({ user: {
              id: scenario === 'duplicate-identity' ? 'same-user' : account + '-id',
              email: scenario === 'wrong-email' && account === 'owner' ? canary : account + '@example.invalid'
            } })) }
        },
        storageState: async () => ({ cookies: structuredClone(cookies), origins: [] }),
        dispose: async () => {
          event({ account, action: 'primary-dispose' })
          if (scenario === 'primary-dispose' && account === 'owner') throw new Error(canary)
        }
      }
    }
    const wrapped = Object.create(playwright)
    const request = Object.create(playwright.request)
    Object.defineProperty(request, 'newContext', { value: factory })
    Object.defineProperty(wrapped, 'request', { value: request })
    await use(wrapped)
  }, { scope: 'worker' }]
})
`
    const reporterPath = path.join(root, 'reporter.mjs')
    fs.writeFileSync(reporterPath, `import fs from 'node:fs'
export default class {
  onTestEnd(_test, result) {
    const messages = result.errors.map(error => String(error.message || ''))
    fs.writeFileSync(${JSON.stringify(outcomePath)}, JSON.stringify({ status: result.status,
      primaryRetained: messages.some(value => value.includes('authentication request is unavailable')),
      cleanupRetained: messages.some(value => value.includes('cleanup is unconfirmed')),
      privateRetained: messages.some(value => value.includes(${JSON.stringify(canary)})) }), { mode: 0o600 })
  }
  printsToStdio() { return true }
  onStdOut() {}
  onStdErr() {}
}`, { mode: 0o600 })
    const config = path.join(root, 'playwright.config.mjs')
    fs.writeFileSync(config, 'export default ' + JSON.stringify({ testDir: directory, workers: 1,
      retries: 0, outputDir: path.join(root, 'results'), reporter: [[reporterPath]],
      use: { trace: 'off', screenshot: 'off', video: 'off' }
    }), { mode: 0o600 })
    for (const scenario of scenarios) {
      fs.rmSync(eventsPath, { force: true })
      fs.rmSync(outcomePath, { force: true })
      const suffix = scenario === 'skip'
        ? `test('controlled fixture skip', async ({ authSessions }) => {
            await authSessions.authenticate('owner@example.invalid', process.env.RELEASE_OWNER_PASSWORD)
            test.skip(true, 'Controlled fixture skip.')
          })`
        : source.slice(boundary)
      fs.writeFileSync(path.join(directory, 'auth-only.spec.js'), prefix + overrides + suffix, { mode: 0o600 })
      const environment = { ...process.env, CI: '1', FORCE_COLOR: '0', AUTH_FIXTURE_SCENARIO: scenario }
      for (const key of Object.keys(environment)) {
        if (key.startsWith('RELEASE_') || key === 'DEBUG' || key === 'PWDEBUG') delete environment[key]
      }
      Object.assign(environment, {
        RELEASE_BASE_URL: origin, RELEASE_SHA: 'a'.repeat(40), GITHUB_SHA: 'a'.repeat(40),
        RELEASE_CHECK_SCOPE: 'auth-only', RELEASE_OWNER_EMAIL: 'owner@example.invalid',
        RELEASE_OWNER_PASSWORD: canary, RELEASE_OTHER_EMAIL: 'other@example.invalid', RELEASE_OTHER_PASSWORD: canary
      })
      if (scenario === 'missing-credentials') delete environment.RELEASE_OTHER_PASSWORD
      if (scenario === 'invalid-origin') environment.RELEASE_BASE_URL = 'https://pourfolio-synthetic-jeremythevas-projects.vercel.app'
      if (scenario === 'source-mismatch') environment.GITHUB_SHA = 'b'.repeat(40)
      if (scenario === 'unexpected-confirmation') environment.RELEASE_DESTRUCTIVE_CONFIRMATION = 'not permitted'
      const child = spawnSync(process.execPath, [path.join(packageDirectory, 'cli.js'), 'test', '--config', config], {
        cwd: root, env: environment, encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024
      })
      assert.ifError(child.error)
      assert.equal(child.signal, null, scenario)
      assert.equal(child.status, ['success', 'skip'].includes(scenario) ? 0 : 1, scenario)
      const outcome = JSON.parse(fs.readFileSync(outcomePath, 'utf8'))
      assert.equal(outcome.status, scenario === 'success' ? 'passed' : scenario === 'skip' ? 'skipped' : 'failed', scenario)
      assert.equal(outcome.privateRetained, false, scenario)
      assert.ok(!child.stdout.includes(canary) && !child.stderr.includes(canary), scenario)
      const events = fs.existsSync(eventsPath)
        ? fs.readFileSync(eventsPath, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
      const primaries = events.filter(event => event.action === 'primary-context')
      const disposed = events.filter(event => event.action === 'primary-dispose')
      assert.deepEqual(disposed.map(event => event.account), primaries.map(event => event.account), scenario)
      const probes = events.filter(event => event.action === 'probe')
      const logouts = events.filter(event => event.action === 'logout')
      assert.deepEqual(probes.map(event => [event.account, event.stage]),
        logouts.map(event => [event.account, event.stage]), scenario)
      if (probes.length) {
        assert.ok(events.findIndex(event => event.action === 'primary-dispose') >
          events.findLastIndex(event => event.action === 'probe'), scenario)
      }
      if (['missing-credentials', 'invalid-origin', 'source-mismatch', 'unexpected-confirmation'].includes(scenario)) {
        assert.equal(events.length, 0, scenario)
      } else if (scenario === 'partial' || scenario === 'primary-and-cleanup') {
        assert.deepEqual(probes.map(event => [event.account, event.stage]), [['owner', 'signin']], scenario)
        assert.equal(outcome.primaryRetained, true, scenario)
        if (scenario === 'primary-and-cleanup') assert.equal(outcome.cleanupRetained, true)
      } else if (['session-rejected', 'wrong-email', 'skip'].includes(scenario)) {
        assert.deepEqual(probes.map(event => [event.account, event.stage]),
          [['owner', 'signin'], ['owner', 'session']], scenario)
      } else {
        assert.equal(primaries.length, 2, scenario)
        assert.equal(probes.length, 4, scenario)
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
