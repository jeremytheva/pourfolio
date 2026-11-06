import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

test('actual profile fixture preserves failure and skip outcomes while cleaning both sessions before closing contexts', { timeout: 90000 }, () => {
  const require = createRequire(import.meta.url)
  const packageDirectory = path.dirname(require.resolve('@playwright/test/package.json'))
  const playwrightModule = pathToFileURL(require.resolve('@playwright/test')).href
  const supportModule = new URL('../support.js', import.meta.url).href
  const reporterPath = fileURLToPath(new URL('../redactedReleaseReporter.js', import.meta.url))
  const source = fs.readFileSync(new URL('../profile-history-readonly.spec.js', import.meta.url), 'utf8')
  const boundary = source.indexOf('// Existing private ratings')
  assert.ok(boundary > 0, 'The production fixture boundary must remain explicit.')
  const prefix = source.slice(0, boundary)
    .replace("import { expect, test as base } from '@playwright/test'", 'import playwrightModule from ' + JSON.stringify(playwrightModule) + '\nconst { expect, test: base } = playwrightModule')
    .replace("from './support.js'", 'from ' + JSON.stringify(supportModule))
  assert.ok(prefix.includes('createReleaseSessionScope'))
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-profile-fixture-'))
  const testDirectory = path.join(temporaryRoot, 'release-check')
  const evidenceDirectory = path.join(temporaryRoot, 'evidence')
  const eventsPath = path.join(temporaryRoot, 'events.jsonl')
  const outcomesPath = path.join(temporaryRoot, 'outcomes.json')
  const privateCanary = 'synthetic-private-profile-cookie-error-title'
  const origin = 'https://brew-buds-mobile-app-design-3577.vercel.app'
  try {
    fs.mkdirSync(testDirectory, { recursive: true })
    fs.writeFileSync(path.join(temporaryRoot, 'package.json'), JSON.stringify({ type: 'module' }), { mode: 0o600 })
    const fixtureSource = prefix + `
import fs from 'node:fs'
const privateCanary = ${JSON.stringify(privateCanary)}
const origin = ${JSON.stringify(origin)}
const event = value => fs.appendFileSync(${JSON.stringify(eventsPath)}, JSON.stringify(value) + '\\n', { mode: 0o600 })
let scenario
const makePage = account => {
  const token = scenario + ':' + account + ':' + privateCanary
  let closed = false
  const context = {
    cookies: async () => {
      if (closed) throw new Error(privateCanary)
      return [{ name: 'session', value: token, domain: new URL(origin).hostname,
        path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' }]
    },
    close: async () => { closed = true; event({ scenario, account, action: 'close' }) }
  }
  return { context: () => context, url: () => origin + '/profile' }
}
const contractTest = test.extend({
  playwright: [async ({ playwright }, use) => {
    const wrappedPlaywright = Object.create(playwright)
    const request = Object.create(playwright.request)
    request.newContext = async options => {
      const [caseName, account] = options.storageState.cookies[0].value.split(':')
      return {
        post: async () => {
          event({ scenario: caseName, account, action: 'logout' })
          if (caseName === 'primary' && account === 'owner') throw new Error(privateCanary)
          return { status: () => 200 }
        },
        get: async () => {
          event({ scenario: caseName, account, action: 'probe' })
          return { status: () => 401 }
        },
        dispose: async () => {}
      }
    }
    Object.defineProperty(wrappedPlaywright, 'request', { value: request })
    await use(wrappedPlaywright)
  }, { scope: 'worker' }],
  browser: [async ({}, use) => {
    await use({ newContext: async () => {
      const otherPage = makePage('other')
      return { newPage: async () => otherPage, close: () => otherPage.context().close() }
    } })
  }, { scope: 'worker' }],
  page: async ({}, use, testInfo) => {
    scenario = testInfo.title.split(':')[0]
    const page = makePage('owner')
    try { await use(page) } finally { await page.context().close() }
  }
})
contractTest('primary:' + privateCanary, async ({ page, releaseSessions }) => {
  const otherPage = await releaseSessions.newPage()
  releaseSessions.track(page, 'owner@example.invalid')
  releaseSessions.beginAuthentication(page)
  releaseSessions.track(otherPage, 'other@example.invalid')
  releaseSessions.beginAuthentication(otherPage)
  console.log(privateCanary)
  console.error(privateCanary)
  throw new Error(privateCanary)
})
contractTest('skipped:' + privateCanary, async ({ page, releaseSessions }) => {
  releaseSessions.track(page, 'owner@example.invalid')
  releaseSessions.beginAuthentication(page)
  contractTest.skip(true, privateCanary)
})
contractTest('success:' + privateCanary, async ({ page, releaseSessions }) => {
  const otherPage = await releaseSessions.newPage()
  releaseSessions.track(page, 'owner@example.invalid')
  releaseSessions.beginAuthentication(page)
  releaseSessions.track(otherPage, 'other@example.invalid')
  releaseSessions.beginAuthentication(otherPage)
})
`
    fs.writeFileSync(path.join(testDirectory, 'profile-history-readonly.spec.js'), fixtureSource, { mode: 0o600 })
    const privateReporterPath = path.join(temporaryRoot, 'outcome-reporter.mjs')
    fs.writeFileSync(privateReporterPath, `import fs from 'node:fs'
export default class {
  outcomes = []
  onTestEnd(test, result) {
    this.outcomes.push({ scenario: test.title.split(':')[0], status: result.status,
      primaryRetained: result.errors.some(error => typeof error.message === 'string' && error.message.includes(${JSON.stringify(privateCanary)})),
      cleanupRetained: result.errors.some(error => typeof error.message === 'string' && error.message.includes('Release session cleanup is unconfirmed.')) })
  }
  onEnd() { fs.writeFileSync(${JSON.stringify(outcomesPath)}, JSON.stringify(this.outcomes), { mode: 0o600 }) }
}`, { mode: 0o600 })
    const configPath = path.join(temporaryRoot, 'playwright.config.mjs')
    fs.writeFileSync(configPath, 'export default ' + JSON.stringify({
      testDir: testDirectory, workers: 1, retries: 0, fullyParallel: false,
      outputDir: path.join(temporaryRoot, 'results'),
      reporter: [[reporterPath, {
        rootDirectory: temporaryRoot,
        env: { RELEASE_SHA: 'a'.repeat(40), RELEASE_EVIDENCE_DIRECTORY: evidenceDirectory }
      }], [privateReporterPath]]
    }), { mode: 0o600 })
    const childEnvironment = { ...process.env, CI: '1', FORCE_COLOR: '0' }
    for (const key of Object.keys(childEnvironment)) {
      if (key.startsWith('RELEASE_') || key === 'DEBUG' || key === 'PWDEBUG') delete childEnvironment[key]
    }
    childEnvironment.RELEASE_BASE_URL = origin
    const child = spawnSync(process.execPath, [path.join(packageDirectory, 'cli.js'), 'test', '--config', configPath], {
      cwd: temporaryRoot, env: childEnvironment, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024
    })
    assert.ifError(child.error)
    assert.equal(child.signal, null)
    assert.equal(child.status, 1)
    assert.deepEqual(JSON.parse(fs.readFileSync(outcomesPath, 'utf8')), [
      { scenario: 'primary', status: 'failed', primaryRetained: true, cleanupRetained: true },
      { scenario: 'skipped', status: 'skipped', primaryRetained: false, cleanupRetained: false },
      { scenario: 'success', status: 'passed', primaryRetained: false, cleanupRetained: false }
    ])
    const events = fs.readFileSync(eventsPath, 'utf8').trim().split('\n').map(line => JSON.parse(line))
    for (const scenario of ['primary', 'skipped', 'success']) {
      const expected = scenario === 'skipped'
        ? [['owner', 'logout'], ['owner', 'probe'], ['owner', 'close']]
        : [['owner', 'logout'], ['owner', 'probe'], ['other', 'logout'], ['other', 'probe'], ['other', 'close'], ['owner', 'close']]
      assert.deepEqual(events.filter(event => event.scenario === scenario).map(event => [event.account, event.action]), expected)
    }
    const summary = fs.readFileSync(path.join(evidenceDirectory, 'release-summary.json'), 'utf8')
    const report = JSON.parse(summary)
    assert.equal(report.status, 'FAIL')
    assert.deepEqual(report.counts, { expected: 3, passed: 1, failed: 1, skipped: 1, notRun: 0 })
    assert.ok(report.tests.every(entry => /^profile-history-readonly\.spec\.js:[1-9]\d*$/.test(entry.caseId)))
    assert.deepEqual(JSON.parse(child.stdout.trim()), report)
    for (const output of [summary, child.stdout, child.stderr, fs.readFileSync(outcomesPath, 'utf8')]) {
      assert.equal(output.includes(privateCanary), false)
    }
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
})
