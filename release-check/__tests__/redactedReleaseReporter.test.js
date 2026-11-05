import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import RedactedReleaseReporter from '../redactedReleaseReporter.js'

const rootDirectory = '/repo'
const secret = 'private-owner-cookie-and-assertion-value'
const specimen = (file = 'connected.spec.js', line = 12) => ({
  location: { file: path.join(rootDirectory, 'release-check', file), line },
  get title() { throw new Error(secret) }
})
const harness = ({ failWrite = false, failRename = false, failOutput = false, env = {} } = {}) => {
  const files = new Map()
  const output = []
  const fileSystem = {
    mkdirSync() {},
    writeFileSync(file, value, options) {
      if (failWrite) throw new Error(secret)
      assert.equal(options.mode, 0o600)
      files.set(file, value)
    },
    renameSync(from, to) {
      if (failRename) throw new Error(secret)
      assert.ok(files.has(from))
      files.set(to, files.get(from))
      files.delete(from)
    }
  }
  const reporter = new RedactedReleaseReporter({
    rootDirectory, fileSystem,
    env: { RELEASE_SHA: 'a'.repeat(40), GITHUB_SHA: 'b'.repeat(40), ...env },
    writeOutput(value) {
      if (failOutput) throw new Error(secret)
      output.push(value)
    }
  })
  return {
    reporter, files, output,
    report() {
      const value = [...files].find(([file]) => file.endsWith('/release-summary.json'))?.[1] || output.at(-1)
      return value ? JSON.parse(value) : null
    }
  }
}
const begin = (h, cases) => h.reporter.onBegin({}, { allTests: () => cases })
const end = (h, status = 'passed') => h.reporter.onEnd({ status })
const assertPrivate = h => {
  const encoded = JSON.stringify([...h.files]) + h.output.join('')
  assert.ok(!encoded.includes(secret))
  assert.ok(!encoded.includes('customer-private.spec.js'))
}

test('reporter publishes only fixed source IDs and outcomes, never private test data', async () => {
  const h = harness()
  const entry = specimen()
  begin(h, [entry])
  assert.equal(h.reporter.printsToStdio(), true)
  h.reporter.onStdOut(Buffer.from(secret), entry)
  h.reporter.onStdErr(Buffer.from(secret), entry)
  assert.equal(h.output.length, 0)
  h.reporter.onTestEnd(entry, {
    status: 'passed', error: new Error(secret), stdout: [secret], stderr: [secret],
    attachments: [{ name: secret, path: secret, body: Buffer.from(secret) }]
  })
  assert.deepEqual(await end(h), { status: 'passed' })
  assert.equal(h.output.length, 1)
  assert.equal(h.files.size, 1)
  const report = h.report()
  assert.equal(report.status, 'PASS')
  assert.equal(report.runnerStatus, 'passed')
  assert.deepEqual(report.tests, [{ caseId: 'connected.spec.js:12', status: 'PASS' }])
  assert.deepEqual(report.counts, { expected: 1, passed: 1, failed: 0, skipped: 0, notRun: 0 })
  assertPrivate(h)
})

test('failed and timed-out cases remain failures without publishing assertion details', async () => {
  const h = harness()
  const cases = [specimen('connected.spec.js', 20), specimen('catalogue-evidence.spec.js', 30)]
  begin(h, cases)
  h.reporter.onTestEnd(cases[0], { status: 'failed', errors: [new Error(secret)] })
  h.reporter.onTestEnd(cases[1], { status: 'timedOut', error: { stack: secret } })
  assert.deepEqual(await end(h, 'failed'), { status: 'failed' })
  const report = h.report()
  assert.equal(report.status, 'FAIL')
  assert.equal(report.runnerStatus, 'failed')
  assert.equal(report.counts.failed, 2)
  assert.ok(report.tests.every(entry => entry.status === 'FAIL'))
  assertPrivate(h)
})

test('failed steps retain only deterministic source locations for their discovered case', async () => {
  const h = harness(), entry = specimen('catalogue-readonly.spec.js', 65)
  begin(h, [entry])
  const failure = (line, category) => ({
    location: { ...entry.location, line }, category, error: new Proxy({}, { get() { throw new Error(secret) } }),
    get title() { throw new Error(secret) }, attachments: [secret], values: [secret]
  })
  h.reporter.onStepEnd(entry, {}, failure(98, 'pw:api'))
  h.reporter.onStepEnd(entry, {}, failure(78, 'expect'))
  h.reporter.onStepEnd(entry, {}, failure(78, 'expect'))
  h.reporter.onStepEnd(entry, {}, { location: entry.location, category: 'hook' })
  h.reporter.onTestEnd(entry, { status: 'failed', error: new Error(secret) })
  await end(h, 'failed')
  assert.deepEqual(h.report().diagnostics, [
    { caseId: 'catalogue-readonly.spec.js:65', sourceId: 'catalogue-readonly.spec.js:78', category: 'expect', status: 'FAIL' },
    { caseId: 'catalogue-readonly.spec.js:65', sourceId: 'catalogue-readonly.spec.js:98', category: 'pw:api', status: 'FAIL' }
  ])
  assert.equal(h.report().invalidDiagnostics, 0)
  assert.deepEqual(h.report().counts, { expected: 1, passed: 0, failed: 1, skipped: 0, notRun: 0 })
  assertPrivate(h)
})

test('unknown diagnostic case, source, category or line is omitted without changing case qualification', async () => {
  const h = harness(), entry = specimen()
  begin(h, [entry])
  const failure = { location: { ...entry.location, line: 20 }, category: 'expect', error: new Error(secret) }
  const invalid = [
    { ...failure, location: { file: '/repo/release-check/customer-private.spec.js', line: 20 } },
    { ...failure, location: specimen('catalogue-readonly.spec.js', 20).location },
    { ...failure, location: { file: '/outside/release-check/connected.spec.js', line: 20 } },
    { ...failure, location: { file: '/repo/release-check/customer-private-helper.js', line: 20 } },
    ...[0, -1, 1.5, 100001, secret].map(line => ({ ...failure, location: { ...entry.location, line } })),
    { ...failure, category: secret }, { ...failure, category: '__proto__' }
  ]
  for (const step of invalid) h.reporter.onStepEnd(entry, {}, step)
  h.reporter.onStepEnd(specimen('connected.spec.js', 999), {}, failure)
  h.reporter.onTestEnd(entry, { status: 'passed' })
  assert.deepEqual(await end(h), { status: 'passed' })
  assert.equal(h.report().status, 'PASS')
  assert.deepEqual(h.report().diagnostics, [])
  assert.equal(h.report().invalidDiagnostics, invalid.length + 1)
  assertPrivate(h)
})

test('reviewed helpers can identify a failed step but never become discovered case identities', async () => {
  const h = harness(), entry = specimen('catalogue-readonly.spec.js', 65)
  begin(h, [entry])
  for (const file of ['support.js', 'ownerSession.js']) {
    h.reporter.onStepEnd(entry, {}, { location: { file: path.join(rootDirectory, 'release-check', file), line: 51 }, category: 'expect', error: new Error(secret) })
  }
  h.reporter.onTestEnd(entry, { status: 'failed' })
  await end(h, 'failed')
  assert.deepEqual(h.report().diagnostics.map(value => value.sourceId).sort(), ['ownerSession.js:51', 'support.js:51'])
  assert.ok(h.report().diagnostics.every(value => value.caseId === 'catalogue-readonly.spec.js:65'))
  assert.equal(h.report().invalidDiagnostics, 0)
  assertPrivate(h)

  const invalid = harness()
  begin(invalid, [specimen('support.js', 51)])
  await end(invalid)
  assert.ok(invalid.report().blockers.includes('INVALID_CASE_IDENTITY'))
  assert.deepEqual(invalid.report().tests, [])
})

test('diagnostic accessors are rejected without invoking getters or serialising their errors', async () => {
  const h = harness(), entry = specimen()
  begin(h, [entry])
  let accesses = 0
  const getter = { get() { accesses += 1; throw new Error(secret) }, enumerable: true }
  const failure = () => ({ location: { ...entry.location, line: 20 }, category: 'expect', error: new Error(secret) })
  for (const field of ['error', 'location', 'category']) {
    const step = failure()
    Object.defineProperty(step, field, getter)
    h.reporter.onStepEnd(entry, {}, step)
  }
  for (const field of ['file', 'line']) {
    const step = failure()
    Object.defineProperty(step.location, field, getter)
    h.reporter.onStepEnd(entry, {}, step)
  }
  const hostileCase = { location: entry.location }
  Object.defineProperty(hostileCase, 'location', getter)
  h.reporter.onStepEnd(hostileCase, {}, failure())
  h.reporter.onStepEnd(entry, {}, new Proxy({}, { getOwnPropertyDescriptor() { throw new Error(secret) } }))
  h.reporter.onTestEnd(entry, { status: 'failed' })
  await end(h, 'failed')
  assert.equal(accesses, 0)
  assert.equal(h.report().invalidDiagnostics, 7)
  assert.deepEqual(h.report().diagnostics, [])
  assertPrivate(h)
})

test('skipped checks are counted separately from passing checks', async () => {
  const h = harness()
  const entry = specimen('profile-history-readonly.spec.js', 40)
  begin(h, [entry])
  h.reporter.onTestEnd(entry, { status: 'skipped', annotations: [{ description: secret }] })
  assert.deepEqual(await end(h), { status: 'passed' })
  const report = h.report()
  assert.equal(report.status, 'PASS_WITH_SKIPS')
  assert.equal(report.counts.passed, 0)
  assert.equal(report.counts.skipped, 1)
  assert.equal(report.tests[0].status, 'SKIPPED')
  assertPrivate(h)
})

test('unexpected files or locations fail closed without exposing their paths or titles', async () => {
  for (const file of [
    '/repo/release-check/customer-private.spec.js',
    '/outside/release-check/connected.spec.js',
    ''
  ]) {
    const h = harness()
    const entry = specimen()
    entry.location = { file, line: 12 }
    begin(h, [entry])
    h.reporter.onTestEnd(entry, { status: 'passed' })
    assert.deepEqual(await end(h), { status: 'failed' })
    const report = h.report()
    assert.equal(report.status, 'BLOCKED')
    assert.ok(report.blockers.includes('INVALID_CASE_IDENTITY'))
    assert.equal(report.tests.length, 0)
    assert.equal(report.counts.passed, 0)
    assertPrivate(h)
  }
})

test('unknown test and runner statuses are replaced by static blockers', async () => {
  const h = harness()
  const entry = specimen()
  begin(h, [entry])
  h.reporter.onTestEnd(entry, { status: secret })
  assert.deepEqual(await end(h, secret), { status: 'failed' })
  const report = h.report()
  assert.equal(report.status, 'BLOCKED')
  assert.equal(report.runnerStatus, 'unknown')
  assert.ok(report.blockers.includes('INVALID_TEST_STATUS'))
  assert.ok(report.blockers.includes('INVALID_RUN_STATUS'))
  assertPrivate(h)
})

test('missing or duplicate results cannot produce a passing report', async () => {
  const incomplete = harness()
  const cases = [specimen('connected.spec.js', 50), specimen('catalogue-readonly.spec.js', 60)]
  begin(incomplete, cases)
  incomplete.reporter.onTestEnd(cases[0], { status: 'passed' })
  assert.deepEqual(await end(incomplete), { status: 'failed' })
  assert.equal(incomplete.report().counts.notRun, 1)
  assert.ok(incomplete.report().blockers.includes('INCOMPLETE_RESULTS'))

  const duplicate = harness()
  begin(duplicate, [cases[0]])
  duplicate.reporter.onTestEnd(cases[0], { status: 'failed' })
  duplicate.reporter.onTestEnd(cases[0], { status: 'passed' })
  assert.deepEqual(await end(duplicate), { status: 'failed' })
  assert.equal(duplicate.report().counts.failed, 1)
  assert.ok(duplicate.report().blockers.includes('DUPLICATE_CASE_RESULT'))
})

test('global runner errors are counted without publishing their contents', async () => {
  const h = harness()
  const entry = specimen()
  begin(h, [entry])
  h.reporter.onTestEnd(entry, { status: 'passed' })
  h.reporter.onError(new Error(secret))
  assert.deepEqual(await end(h, 'failed'), { status: 'failed' })
  const report = h.report()
  assert.equal(report.status, 'BLOCKED')
  assert.equal(report.runnerErrors, 1)
  assert.ok(report.blockers.includes('RUNNER_ERROR'))
  assertPrivate(h)
})

test('write or atomic publication failures override an otherwise passing runner', async () => {
  for (const option of [{ failWrite: true }, { failRename: true }]) {
    const h = harness(option)
    const entry = specimen()
    begin(h, [entry])
    h.reporter.onTestEnd(entry, { status: 'passed' })
    assert.deepEqual(await end(h), { status: 'failed' })
    assert.equal(h.report().status, 'BLOCKED')
    assert.ok(h.report().blockers.includes('REPORT_WRITE_FAILED'))
    assert.ok(![...h.files.keys()].some(file => file.endsWith('/release-summary.json')))
    assertPrivate(h)
  }
})

test('stdout failures leave a blocked artifact and never publish raw errors', async () => {
  const h = harness({ failOutput: true })
  const entry = specimen()
  begin(h, [entry])
  h.reporter.onTestEnd(entry, { status: 'passed' })
  assert.deepEqual(await end(h), { status: 'failed' })
  assert.equal(h.report().status, 'BLOCKED')
  assert.ok(h.report().blockers.includes('REPORT_OUTPUT_FAILED'))
  assertPrivate(h)
})

test('missing public release identity blocks certification without printing configuration values', async () => {
  const h = harness({ env: { RELEASE_SHA: secret, GITHUB_SHA: secret, RELEASE_OWNER_EMAIL: secret } })
  const entry = specimen()
  begin(h, [entry])
  h.reporter.onTestEnd(entry, { status: 'passed' })
  assert.deepEqual(await end(h), { status: 'failed' })
  const report = h.report()
  assert.equal(report.releaseSha, null)
  assert.equal(report.candidateSha, null)
  assert.ok(report.blockers.includes('RELEASE_IDENTITY_MISSING'))
  assertPrivate(h)
})

test('real Playwright CLI retains failure status and emits only redacted case evidence', { timeout: 90000 }, () => {
  const require = createRequire(import.meta.url)
  const packageDirectory = path.dirname(require.resolve('@playwright/test/package.json'))
  const playwrightModule = pathToFileURL(require.resolve('@playwright/test')).href
  const reporterPath = fileURLToPath(new URL('../redactedReleaseReporter.js', import.meta.url))
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-reporter-smoke-'))
  const evidenceDirectory = path.join(temporaryRoot, 'evidence')
  const privateValues = {
    title: 'synthetic-private-reporter-title',
    error: 'synthetic-private-reporter-error',
    stdout: 'synthetic-private-reporter-stdout',
    stderr: 'synthetic-private-reporter-stderr',
    attachment: 'synthetic-private-reporter-attachment',
    assertion: 'synthetic-private-reporter-assertion-value',
    apiTitle: 'synthetic-private-reporter-api-title',
    invalidUrl: 'https://[synthetic-private-reporter-invalid-url'
  }

  try {
    const testDirectory = path.join(temporaryRoot, 'release-check')
    fs.mkdirSync(testDirectory, { recursive: true })
    fs.writeFileSync(path.join(temporaryRoot, 'package.json'), JSON.stringify({ type: 'module' }), { mode: 0o600 })
    const assertionHelper = [
      'import playwright from ' + JSON.stringify(playwrightModule),
      'const { expect } = playwright',
      'export const failAssertion = () => {',
      '  expect(' + JSON.stringify(privateValues.assertion) + ').toBe("public-expected-value")',
      '}'
    ]
    const apiHelper = [
      'import playwright from ' + JSON.stringify(playwrightModule),
      'const { request } = playwright',
      'export const failApi = async () => {',
      '  const context = await request.newContext()',
      '  try { await context.get(' + JSON.stringify(privateValues.invalidUrl) + ') } finally { await context.dispose() }',
      '}'
    ]
    fs.writeFileSync(path.join(testDirectory, 'support.js'), assertionHelper.join('\n'), { mode: 0o600 })
    fs.writeFileSync(path.join(testDirectory, 'ownerSession.js'), apiHelper.join('\n'), { mode: 0o600 })
    const sourceLines = [
      'import playwright from ' + JSON.stringify(playwrightModule),
      "import { failAssertion } from './support.js'",
      "import { failApi } from './ownerSession.js'",
      'const { test } = playwright',
      "test('public protocol smoke pass', async () => {})",
      'test(' + JSON.stringify(privateValues.title) + ', async ({}, testInfo) => {',
      '  console.log(' + JSON.stringify(privateValues.stdout) + ')',
      '  console.error(' + JSON.stringify(privateValues.stderr) + ')',
      '  await testInfo.attach(' + JSON.stringify(privateValues.attachment) +
        ', { body: Buffer.from(' + JSON.stringify(privateValues.attachment) + '), contentType: "text/plain" })',
      '  throw new Error(' + JSON.stringify(privateValues.error) + ')',
      '})',
      'test(' + JSON.stringify(privateValues.title + '-assertion') + ', async () => {',
      '  failAssertion()',
      '})',
      'test(' + JSON.stringify(privateValues.apiTitle) + ', async () => {',
      '  await failApi()',
      '})'
    ]
    const assertionLine = assertionHelper.findIndex(line => line.startsWith('  expect(')) + 1
    const apiLine = apiHelper.findIndex(line => line.startsWith('  try { await context.get(')) + 1
    const plainThrowCaseLine = sourceLines.findIndex(line => line.startsWith('test(' + JSON.stringify(privateValues.title) + ',')) + 1
    fs.writeFileSync(path.join(testDirectory, 'connected.spec.js'), sourceLines.join('\n'), { mode: 0o600 })

    const configPath = path.join(temporaryRoot, 'playwright.config.mjs')
    fs.writeFileSync(configPath, 'export default ' + JSON.stringify({
      testDir: testDirectory,
      outputDir: path.join(temporaryRoot, 'results'),
      workers: 1,
      retries: 0,
      fullyParallel: false,
      reporter: [[reporterPath, {
        rootDirectory: temporaryRoot,
        env: { RELEASE_SHA: 'a'.repeat(40), RELEASE_EVIDENCE_DIRECTORY: evidenceDirectory }
      }]]
    }), { mode: 0o600 })

    const childEnvironment = { ...process.env, CI: '1', FORCE_COLOR: '0' }
    delete childEnvironment.DEBUG
    delete childEnvironment.PWDEBUG
    const child = spawnSync(process.execPath, [
      path.join(packageDirectory, 'cli.js'), 'test', '--config', configPath
    ], {
      cwd: temporaryRoot,
      env: childEnvironment,
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024
    })

    assert.ifError(child.error)
    assert.equal(child.signal, null)
    assert.equal(child.status, 1)
    const summary = fs.readFileSync(path.join(evidenceDirectory, 'release-summary.json'), 'utf8')
    const report = JSON.parse(summary)
    assert.equal(report.status, 'FAIL')
    assert.equal(report.runnerStatus, 'failed')
    assert.deepEqual(report.counts, { expected: 4, passed: 1, failed: 3, skipped: 0, notRun: 0 })
    assert.equal(report.tests.length, 4)
    assert.ok(report.tests.every(entry => /^connected\.spec\.js:[1-9]\d*$/.test(entry.caseId)))
    assert.equal(report.invalidDiagnostics, 0)
    assert.ok(report.diagnostics.some(entry => entry.sourceId === `support.js:${assertionLine}` && entry.category === 'expect' && entry.status === 'FAIL'))
    assert.ok(report.diagnostics.some(entry => entry.sourceId === `ownerSession.js:${apiLine}` && entry.category === 'pw:api' && entry.status === 'FAIL'))
    assert.ok(report.diagnostics.every(entry => entry.caseId !== `connected.spec.js:${plainThrowCaseLine}`))
    const outputLines = child.stdout.trim().split(/\r?\n/).filter(Boolean)
    assert.equal(outputLines.length, 1)
    assert.deepEqual(JSON.parse(outputLines[0]), report)
    for (const value of Object.values(privateValues)) {
      assert.ok(!child.stdout.includes(value))
      assert.ok(!child.stderr.includes(value))
      assert.ok(!summary.includes(value))
    }
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
})
