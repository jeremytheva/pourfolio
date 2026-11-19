import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { createRequire } from 'node:module'
import { checkProviderContractTranscript } from '../check-provider-contract-transcript.js'

test('connected provider workflows keep production provider configuration owned by the deployed runtime', () => {
  const providerWorkflow = fs.readFileSync('.github/workflows/connected-provider-contract.yml', 'utf8')
  const releaseWorkflow = fs.readFileSync('.github/workflows/connected-release-check.yml', 'utf8')
  const repositoryValuePattern = /NOCODEBACKEND_INSTANCE:\s+(?!\$\{\{)/

  assert.match(providerWorkflow, /workflow_dispatch:/)
  assert.match(providerWorkflow, /environment: staging-release/)
  assert.match(providerWorkflow, /ref: \$\{\{ inputs\.release_sha \}\}/)
  assert.match(providerWorkflow, /\^\[0-9a-f\]\{40\}\$/)
  assert.match(providerWorkflow, /isolated-staging-destructive-provider-contract/)
  assert.match(providerWorkflow, /NOCODEBACKEND_CONTRACT_ENVIRONMENT: isolated-staging/)
  assert.match(providerWorkflow, /NOCODEBACKEND_CONTRACT_ALLOW_DESTRUCTIVE: "1"/)
  assert.match(providerWorkflow, /NOCODEBACKEND_DATA_BASE_URL: https:\/\/api\.nocodebackend\.com\//)
  assert.match(providerWorkflow, /NOCODEBACKEND_INSTANCE: \$\{\{ vars\.NOCODEBACKEND_INSTANCE \}\}/)
  assert.doesNotMatch(providerWorkflow, repositoryValuePattern)
  assert.match(providerWorkflow, /redacted-transcript\.json/)
  assert.match(providerWorkflow, /check:provider-contract-transcript/)
  assert.match(providerWorkflow, /if-no-files-found: error/)
  assert.doesNotMatch(providerWorkflow, /pull_request:|push:/)

  assert.match(releaseWorkflow, /issue_comment:/)
  assert.match(releaseWorkflow, /workflow_dispatch:/)
  assert.ok(releaseWorkflow.includes("github.event.issue.number == 278"))
  assert.ok(releaseWorkflow.includes("github.event.comment.body == '/release-certify'"))
  assert.ok(releaseWorkflow.includes('github.event.comment.user.login == github.repository_owner'))
  assert.ok(releaseWorkflow.includes('!github.event.issue.pull_request'))
  assert.ok(releaseWorkflow.includes('RELEASE_BASE_URL:'))
  assert.ok(releaseWorkflow.includes("github.event_name == 'issue_comment'"))
  assert.ok(releaseWorkflow.includes('inputs.release_url'))
  assert.ok(releaseWorkflow.includes("RELEASE_SHA: ${{ github.event_name == 'issue_comment' && github.sha || inputs.release_sha }}"))
  assert.ok(releaseWorkflow.includes("RELEASE_DESTRUCTIVE_CONFIRMATION: ${{ github.event_name == 'workflow_dispatch' && inputs.destructive_confirmation || '' }}"))
  assert.match(releaseWorkflow, /Verify release target origin and provenance/)
  assert.match(releaseWorkflow, /node scripts\/verify-release-target\.js/)
  assert.doesNotMatch(releaseWorkflow, /NOCODEBACKEND_SECRET_KEY/)
  assert.ok(releaseWorkflow.includes("RELEASE_FIXTURE_ENCRYPTION_KEY: ${{ env.RELEASE_CHECK_SCOPE == 'all' && secrets.RELEASE_FIXTURE_ENCRYPTION_KEY || '' }}"))
  const connectedChecks = fs.readFileSync('release-check/connected.spec.js', 'utf8')
  const writerConfiguration = connectedChecks.match(/createCellarCheckpointWriter\(\{([\s\S]*?)\n {2}\}\)/)?.[1]
  assert.ok(writerConfiguration)
  assert.match(writerConfiguration, /secret: process\.env\.RELEASE_FIXTURE_ENCRYPTION_KEY,/)
  assert.doesNotMatch(writerConfiguration, /NOCODEBACKEND_|RELEASE_(?:OWNER|OTHER)_PASSWORD|\|\||\?\?/)
  assert.doesNotMatch(releaseWorkflow, /NOCODEBACKEND_INSTANCE/)
  assert.doesNotMatch(releaseWorkflow, /test:provider-smoke/)
  assert.doesNotMatch(releaseWorkflow, repositoryValuePattern)

  const preflight = releaseWorkflow.indexOf('Verify release target origin and provenance')
  const credentialedChecks = releaseWorkflow.indexOf('Run connected release checks')
  const ownerPassword = releaseWorkflow.indexOf('RELEASE_OWNER_PASSWORD:')
  assert.ok(preflight >= 0)
  assert.ok(credentialedChecks > preflight)
  assert.ok(ownerPassword > preflight)
})

test('provider transcript checker requires cleanup and rejects sensitive values', () => {
  const passing = checkProviderContractTranscript({
    entries: [{ request: { path: '/ratings' }, response: { status: 200 } }],
    cleanup: { attempted: 2, failures: 0, status: 'PASS' }
  }, ['private-secret'])
  assert.equal(passing.status, 'PASS')

  const blocked = checkProviderContractTranscript({
    entries: [{ request: { path: '/ratings?user=private-secret' } }],
    cleanup: { attempted: 2, failures: 1, status: 'BLOCKED' }
  }, ['private-secret'])
  assert.equal(blocked.status, 'BLOCKED')
  assert.deepEqual(blocked.blockers.map((blocker) => blocker.code), [
    'CLEANUP_NOT_PROVEN',
    'SENSITIVE_VALUE_PRESENT'
  ])
})

const releaseWorkflow = fs.readFileSync('.github/workflows/connected-release-check.yml', 'utf8')
const releaseStep = (name) => {
  const marker = '      - name: ' + name + '\n'
  assert.equal(releaseWorkflow.split(marker).length, 2)
  const start = releaseWorkflow.indexOf(marker) + marker.length
  const next = releaseWorkflow.indexOf('\n      - ', start)
  return releaseWorkflow.slice(start, next < 0 ? undefined : next)
}
const stepShell = (name) => {
  const lines = releaseStep(name).split('\n')
  const start = lines.indexOf('        run: |')
  assert.ok(start >= 0)
  const body = []
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith('          ')) break
    body.push(line.slice(10))
  }
  return body.join('\n')
}
const validationShell = stepShell('Validate release check scope')
const selectionShell = stepShell('Run connected release checks with redacted evidence')
const qualificationShell = stepShell('Qualify only complete narrow release evidence')
const qualificationSource = qualificationShell.slice(qualificationShell.indexOf("<<'JS'\n") + 7,
  qualificationShell.lastIndexOf('\nJS')).replace("import fs from 'node:fs'\n", '')
const runQualification = new Function('fs', 'process', 'Buffer', qualificationSource)
const canary = 'private-source-scope-report-canary'
const sourceSha = 'a'.repeat(40)
const shellEnvironment = {
  RELEASE_CHECK_SCOPE: 'profile-history', RELEASE_SHA: sourceSha,
  REVIEWED_MAIN_SHA: sourceSha, RELEASE_DESTRUCTIVE_CONFIRMATION: '',
  RELEASE_BASE_URL: 'https://brew-buds-mobile-app-design-3577.vercel.app'
}
const bash = (script, environment, directory) => {
  const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
    cwd: directory, env: { ...process.env, ...environment }, encoding: 'utf8', timeout: 10000
  })
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  return result
}

test('release scope validation executes before credentials and rejects unknown scopes, writes and older sources', () => {
  assert.match(releaseWorkflow, /scope:\n {8}description:[^\n]+\n {8}required: true\n {8}default: all\n {8}type: choice\n {8}options: \[all, profile-history, auth-only\]/)
  assert.ok(releaseWorkflow.includes("RELEASE_CHECK_SCOPE: ${{ github.event_name == 'issue_comment' && 'all' || inputs.scope }}"))
  assert.ok(releaseWorkflow.indexOf('Validate release check scope') < releaseWorkflow.indexOf('RELEASE_OWNER_PASSWORD:'))
  for (const scope of ['all', 'profile-history', 'auth-only']) {
    const result = bash(validationShell, { ...shellEnvironment, RELEASE_CHECK_SCOPE: scope })
    assert.equal(result.status, 0)
  }
  const all = bash(validationShell, { ...shellEnvironment, RELEASE_CHECK_SCOPE: 'all',
    RELEASE_SHA: 'b'.repeat(40), RELEASE_DESTRUCTIVE_CONFIRMATION: 'RUN CLEANUP-GUARDED RELEASE WRITES' })
  assert.equal(all.status, 0)
  for (const [change, expected] of [
    [{ RELEASE_CHECK_SCOPE: '' }, 'RELEASE_CHECK_SCOPE_INVALID'],
    [{ RELEASE_CHECK_SCOPE: 'profile-history;' + canary }, 'RELEASE_CHECK_SCOPE_INVALID'],
    [{ RELEASE_CHECK_SCOPE: '$(printf ' + canary + ')' }, 'RELEASE_CHECK_SCOPE_INVALID'],
    [{ RELEASE_CHECK_SCOPE: '--grep=.' }, 'RELEASE_CHECK_SCOPE_INVALID'],
    [{ RELEASE_DESTRUCTIVE_CONFIRMATION: 'RUN CLEANUP-GUARDED RELEASE WRITES' }, 'PROFILE_HISTORY_WRITES_FORBIDDEN'],
    [{ RELEASE_SHA: 'b'.repeat(40) }, 'PROFILE_HISTORY_REQUIRES_CURRENT_MAIN']
  ]) {
    const result = bash(validationShell, { ...shellEnvironment, ...change })
    assert.equal(result.status, 2)
    assert.deepEqual(JSON.parse(result.stdout), { status: 'BLOCKED', code: expected })
    assert.equal((result.stdout + result.stderr).includes(canary), false)
  }
})

test('actual release command selects only fixed narrow-scope files and preserves full-suite arguments and exit status', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-release-scope-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(bin, 'npm'), ['#!/bin/bash', 'printf \'%s\\n\' "$@" > "$PROFILE_ARGS_FILE"', 'exit "${PROFILE_NPM_EXIT:-0}"', ''].join('\n'), { mode: 0o700 })
  fs.writeFileSync(path.join(bin, 'node'), '#!/bin/bash\ncat >/dev/null\n', { mode: 0o700 })
  const argsFile = path.join(directory, 'args.txt')
  const environment = { ...shellEnvironment, PATH: bin + path.delimiter + process.env.PATH,
    RUNNER_TEMP: directory, GITHUB_RUN_ID: '123', PROFILE_ARGS_FILE: argsFile }
  const flags = ['--reporter=./release-check/redactedReleaseReporter.js', '--retries=0']
  for (const scope of ['all', 'profile-history', 'auth-only']) {
    const result = bash(selectionShell, { ...environment, RELEASE_CHECK_SCOPE: scope }, directory)
    assert.equal(result.status, 0)
    assert.deepEqual(fs.readFileSync(argsFile, 'utf8').trim().split('\n'),
      ['run', 'test:release', '--', ...(scope === 'profile-history' ? ['release-check/profile-history-readonly.spec.js'] : scope === 'auth-only' ? ['release-check/auth-only.spec.js'] : []), ...flags])
  }
  assert.equal(bash(selectionShell, { ...environment, RELEASE_CHECK_SCOPE: 'all', PROFILE_NPM_EXIT: '7' }, directory).status, 7)
  fs.rmSync(argsFile)
  const rejected = bash(selectionShell, { ...environment, RELEASE_CHECK_SCOPE: 'profile-history; ' + canary }, directory)
  assert.equal(rejected.status, 2)
  assert.equal(fs.existsSync(argsFile), false)
  assert.equal((rejected.stdout + rejected.stderr).includes(canary), false)
})

const profileSpec = fs.readFileSync('release-check/profile-history-readonly.spec.js', 'utf8')
const caseIds = [
  'connected private history links, controlled retry and repeated reloads preserve the exact owner tasting',
  'connected other-account history cannot resolve an owner rating link'
].map(title => {
  const index = profileSpec.split('\n').findIndex(line => line.startsWith("test('" + title + "',"))
  assert.ok(index >= 0)
  return 'profile-history-readonly.spec.js:' + (index + 1)
})
const profileFixture = () => ({
  version: 1, qualification: 'CONNECTED_RELEASE_CHECKS', releaseSha: sourceSha, candidateSha: sourceSha,
  status: 'PASS', runnerStatus: 'passed', counts: { expected: 2, passed: 2, failed: 0, skipped: 0, notRun: 0 },
  invalidEvents: 0, invalidDiagnostics: 0, runnerErrors: 0, diagnostics: [], blockers: [],
  tests: caseIds.map(caseId => ({ caseId, status: 'PASS' }))
})
const authSpec = fs.readFileSync('release-check/auth-only.spec.js', 'utf8')
const authCaseIds = authSpec.split('\n').flatMap((line, index) =>
  line.startsWith("test('") ? ['auth-only.spec.js:' + (index + 1)] : [])
const authFixture = () => ({ ...profileFixture(),
  counts: { expected: 1, passed: 1, failed: 0, skipped: 0, notRun: 0 },
  tests: authCaseIds.map(caseId => ({ caseId, status: 'PASS' }))
})
const qualify = ({ scope = 'profile-history', report = scope === 'auth-only' ? authFixture() : profileFixture(),
  env = {}, preflight, postflight, spec = scope === 'auth-only' ? authSpec : profileSpec, writeThrows = false } = {}) => {
  const provenance = { status: 'PASS', commitSha: sourceSha, environment: 'production', dataProvider: 'ok' }
  const files = {
    ['release-check/' + (scope === 'auth-only' ? 'auth-only.spec.js' : 'profile-history-readonly.spec.js')]: spec,
    'artifacts/connected-release/release-summary.json': report === null ? null : typeof report === 'string' ? report : JSON.stringify(report),
    ['artifacts/connected-release/' + scope + '-preflight.json']: JSON.stringify(preflight || provenance),
    ['artifacts/connected-release/' + scope + '-postflight.json']: JSON.stringify(postflight || provenance)
  }
  let written
  const output = []
  const runtime = { env: { RELEASE_CHECK_SCOPE: scope, RELEASE_SHA: sourceSha, GITHUB_SHA: sourceSha, NARROW_PREFLIGHT_OUTCOME: 'success',
    NARROW_POSTFLIGHT_OUTCOME: 'success', NARROW_CHECK_OUTCOME: 'success', ...env }, exitCode: 0,
  stdout: { write: value => output.push(value) } }
  runQualification({
    readFileSync(file) { if (files[file] === null || files[file] === undefined) throw new Error(canary); return files[file] },
    mkdirSync() {},
    writeFileSync(file, value, options) {
      const effectiveScope = runtime.env.RELEASE_CHECK_SCOPE
      const artifactName = ['profile-history', 'auth-only'].includes(effectiveScope) ? effectiveScope : 'unsupported'
      assert.equal(file, 'artifacts/connected-release/' + artifactName + '-qualification.json')
      assert.equal(options.mode, 0o600)
      if (writeThrows) throw new Error(canary)
      written = value
    }
  }, runtime, Buffer)
  assert.equal(output.length, 1)
  assert.equal(output[0].includes(canary), false)
  if (written) {
    assert.equal(written.includes(canary), false)
    assert.deepEqual(JSON.parse(written), JSON.parse(output[0]))
  }
  return { report: JSON.parse(output[0]), exitCode: runtime.exitCode, written }
}

test('actual profile qualification requires exact source, two distinct current case IDs and clean pre/post provenance', () => {
  const passing = qualify({ report: { ...profileFixture(), ignoredPrivateField: canary } })
  assert.equal(passing.exitCode, 0)
  assert.deepEqual(passing.report, { version: 1, qualification: 'PRIVATE_PROFILE_HISTORY', releaseSha: sourceSha,
    status: 'PASS', code: 'PROFILE_HISTORY_QUALIFIED', expectedCases: 2, qualifiedCases: 2,
    preflight: 'PASS', postflight: 'PASS' })
  for (const options of [
    { env: { RELEASE_SHA: canary } }, { env: { GITHUB_SHA: 'b'.repeat(40) } },
    { env: { NARROW_CHECK_OUTCOME: 'skipped' } }, { env: { NARROW_CHECK_OUTCOME: 'failure' } },
    { env: { NARROW_PREFLIGHT_OUTCOME: 'failure' } }, { env: { NARROW_POSTFLIGHT_OUTCOME: 'skipped' } },
    { preflight: { status: 'PASS', commitSha: 'b'.repeat(40), environment: 'production', dataProvider: 'ok' } },
    { postflight: { status: 'PASS', commitSha: sourceSha, environment: 'foreign', dataProvider: 'ok' } },
    { postflight: { status: 'PASS', commitSha: sourceSha, environment: 'preview', dataProvider: 'ok' } },
    { spec: canary }, { report: null }, { report: '{' + canary }, { writeThrows: true }
  ]) {
    const result = qualify(options)
    assert.equal(result.exitCode, 1)
    assert.equal(result.report.status, 'BLOCKED')
    assert.equal(result.report.qualifiedCases, 0)
  }
})

test('profile qualification rejects skipped, partial, foreign, duplicate and invalid diagnostic outcomes without retaining private values', () => {
  const mutations = [
    value => { value.counts.skipped = 1; value.counts.passed = 1; value.status = 'PASS_WITH_SKIPS'; value.tests[1].status = 'SKIPPED' },
    value => { value.counts.expected = 3 }, value => { value.counts.failed = 1 },
    value => { value.counts.notRun = 1 }, value => { value.tests.pop() },
    value => { value.tests[1].caseId = value.tests[0].caseId },
    value => { value.tests[0].caseId = 'connected.spec.js:1' },
    value => { value.tests[0].caseId = 'profile-history-readonly.spec.js:99999' },
    value => { value.releaseSha = 'b'.repeat(40) }, value => { value.candidateSha = 'b'.repeat(40) },
    value => { value.invalidEvents = 1 }, value => { value.invalidDiagnostics = 1 },
    value => { value.runnerErrors = 1 }, value => { value.blockers = [canary] },
    value => { value.diagnostics = [{ error: canary }] }, value => { value.runnerStatus = 'failed' },
    value => { value.counts = { private: canary } }
  ]
  for (const mutate of mutations) {
    const report = profileFixture()
    mutate(report)
    const result = qualify({ report })
    assert.equal(result.exitCode, 1)
    assert.equal(result.report.status, 'BLOCKED')
    assert.equal(result.report.qualifiedCases, 0)
  }
})

test('profile workflow withholds unused credentials and always verifies the attempted target before fixed qualification', () => {
  for (const key of ['RELEASE_FIXTURE_ENCRYPTION_KEY', 'RELEASE_SIGNUP_EMAIL', 'RELEASE_SIGNUP_PASSWORD', 'RELEASE_OTP_EMAIL', 'RELEASE_OTP_CODE']) {
    assert.ok(releaseWorkflow.includes(key + ": ${{ env.RELEASE_CHECK_SCOPE == 'all' && secrets." + key + " || '' }}"))
  }
  assert.ok(releaseStep('Verify narrow release target after attempted checks').includes("always() && contains(fromJSON('[\"profile-history\",\"auth-only\"]'), env.RELEASE_CHECK_SCOPE) && contains(fromJSON('[\"success\",\"failure\",\"cancelled\"]'), steps.release_checks.outcome)"))
  assert.ok(releaseStep('Qualify only complete narrow release evidence').includes("always() && contains(fromJSON('[\"profile-history\",\"auth-only\"]'), env.RELEASE_CHECK_SCOPE)"))
  assert.ok(releaseWorkflow.indexOf('Verify narrow release target after attempted checks') < releaseWorkflow.indexOf('Qualify only complete narrow release evidence'))
  assert.ok(releaseWorkflow.indexOf('Qualify only complete narrow release evidence') < releaseWorkflow.indexOf('Remove private diagnostics and temporary owner session'))
  for (const file of ['profile-history-preflight.json', 'profile-history-postflight.json', 'profile-history-qualification.json']) {
    assert.ok(releaseWorkflow.includes('            artifacts/connected-release/' + file))
  }
})


test('authentication scope rejects writes, stale source and every noncanonical production origin before credentials', () => {
  for (const [change, code] of [
    [{ RELEASE_DESTRUCTIVE_CONFIRMATION: 'RUN CLEANUP-GUARDED RELEASE WRITES' }, 'AUTH_ONLY_WRITES_FORBIDDEN'],
    [{ RELEASE_SHA: 'b'.repeat(40) }, 'AUTH_ONLY_REQUIRES_CURRENT_MAIN'],
    ...['https://pourfolio-example-jeremythevas-projects.vercel.app',
      'https://brew-buds-mobile-app-design-3577.vercel.app/',
      'https://brew-buds-mobile-app-design-3577.vercel.app?' + canary,
      'http://brew-buds-mobile-app-design-3577.vercel.app', canary].map(RELEASE_BASE_URL =>
      [{ RELEASE_BASE_URL }, 'AUTH_ONLY_REQUIRES_PRODUCTION_ORIGIN'])
  ]) {
    const result = bash(validationShell, { ...shellEnvironment, RELEASE_CHECK_SCOPE: 'auth-only', ...change })
    assert.equal(result.status, 2)
    assert.deepEqual(JSON.parse(result.stdout), { status: 'BLOCKED', code })
    assert.equal((result.stdout + result.stderr).includes(canary), false)
  }
  const canonical = releaseWorkflow.indexOf('Validate the exact authentication candidate')
  assert.ok(canonical > releaseWorkflow.indexOf('Verify release target origin and provenance'))
  assert.ok(canonical < releaseWorkflow.indexOf('RELEASE_OWNER_PASSWORD:'))
  assert.ok(releaseStep('Validate the exact authentication candidate').includes('npm run platform:validate'))
  assert.ok(releaseStep('Install Chromium for browser scopes').includes("env.RELEASE_CHECK_SCOPE != 'auth-only'"))
})

test('authentication qualification accepts only the one checked-out two-account case on exact production provenance', () => {
  assert.equal(authCaseIds.length, 1)
  const result = qualify({ scope: 'auth-only', report: { ...authFixture(), ignoredPrivateField: canary } })
  assert.equal(result.exitCode, 0)
  assert.deepEqual(result.report, { version: 1, qualification: 'AUTH_ONLY', releaseSha: sourceSha,
    status: 'PASS', code: 'AUTH_ONLY_QUALIFIED', expectedCases: 1, qualifiedCases: 1,
    preflight: 'PASS', postflight: 'PASS' })
  const preview = { status: 'PASS', commitSha: sourceSha, environment: 'preview', dataProvider: 'ok' }
  for (const options of [
    { env: { RELEASE_CHECK_SCOPE: canary } },
    { env: { GITHUB_SHA: 'b'.repeat(40) } }, { env: { RELEASE_SHA: canary } },
    { env: { NARROW_CHECK_OUTCOME: 'skipped' } }, { env: { NARROW_CHECK_OUTCOME: 'failure' } },
    { env: { NARROW_PREFLIGHT_OUTCOME: 'failure' } }, { env: { NARROW_POSTFLIGHT_OUTCOME: 'skipped' } },
    { preflight: preview }, { postflight: preview }, { preflight: preview, postflight: preview },
    { spec: canary }, { report: null }, { report: '{' + canary }, { writeThrows: true },
    { report: profileFixture() }
  ]) {
    const result = qualify({ scope: 'auth-only', ...options })
    assert.equal(result.exitCode, 1)
    assert.equal(result.report.status, 'BLOCKED')
    assert.equal(result.report.qualifiedCases, 0)
  }
  const profilePreview = qualify({ preflight: preview, postflight: preview })
  assert.equal(profilePreview.exitCode, 0, 'Existing profile preview qualification stays supported.')
})

test('authentication qualification rejects partial, skipped, foreign and private diagnostic outcomes', () => {
  for (const mutate of [
    value => { value.tests[0].status = 'SKIPPED'; value.counts.skipped = 1; value.counts.passed = 0 },
    value => { value.tests[0].caseId = caseIds[0] },
    value => { value.tests[0].caseId = 'auth-only.spec.js:99999' },
    value => { value.tests.push({ ...value.tests[0] }) },
    value => { value.counts.expected = 2 }, value => { value.counts.failed = 1 },
    value => { value.counts.notRun = 1 }, value => { value.runnerStatus = 'failed' },
    value => { value.candidateSha = 'b'.repeat(40) }, value => { value.releaseSha = 'b'.repeat(40) },
    value => { value.invalidEvents = 1 }, value => { value.invalidDiagnostics = 1 },
    value => { value.runnerErrors = 1 }, value => { value.blockers = [canary] },
    value => { value.diagnostics = [{ private: canary }] }
  ]) {
    const report = authFixture()
    mutate(report)
    const result = qualify({ scope: 'auth-only', report })
    assert.equal(result.exitCode, 1)
    assert.equal(result.report.status, 'BLOCKED')
    assert.equal(result.report.qualifiedCases, 0)
  }
  for (const file of ['auth-only-preflight.json', 'auth-only-postflight.json', 'auth-only-qualification.json']) {
    assert.ok(releaseWorkflow.includes('            artifacts/connected-release/' + file))
  }
  assert.ok(releaseStep('Remove private diagnostics and temporary owner session').includes('if: always()'))
})

test('actual release discovery selects authentication only for its explicit scope without adding skips to other scopes', { timeout: 30000 }, () => {
  const require = createRequire(import.meta.url)
  const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js')
  for (const scope of [undefined, 'all', 'profile-history', 'auth-only']) {
    const environment = { ...process.env, CI: '1', FORCE_COLOR: '0' }
    for (const key of Object.keys(environment)) if (key.startsWith('RELEASE_') || key === 'PWDEBUG' || key === 'DEBUG') delete environment[key]
    Object.assign(environment, { RELEASE_BASE_URL: shellEnvironment.RELEASE_BASE_URL,
      RELEASE_SHA: sourceSha, GITHUB_SHA: sourceSha,
      RELEASE_OWNER_EMAIL: 'synthetic-owner@example.invalid', RELEASE_OWNER_PASSWORD: 'synthetic-unused-password',
      RELEASE_OTHER_EMAIL: 'synthetic-other@example.invalid', RELEASE_OTHER_PASSWORD: 'synthetic-unused-password' })
    if (scope !== undefined) environment.RELEASE_CHECK_SCOPE = scope
    const selectedFile = scope === 'auth-only' ? ['release-check/auth-only.spec.js']
      : scope === 'profile-history' ? ['release-check/profile-history-readonly.spec.js'] : []
    const child = spawnSync(process.execPath, [cli, 'test', '--config', 'playwright.release.config.js',
      ...selectedFile, '--list', '--reporter=json'], { cwd: process.cwd(), env: environment,
      encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 })
    assert.ifError(child.error)
    assert.equal(child.signal, null)
    assert.equal(child.status, 0)
    const report = JSON.parse(child.stdout)
    assert.deepEqual(report.errors, [])
    const files = []
    const visit = suite => {
      for (const spec of suite.specs || []) files.push(spec.file)
      for (const item of suite.suites || []) visit(item)
    }
    for (const suite of report.suites) visit(suite)
    const authCases = files.filter(file => file.endsWith('auth-only.spec.js'))
    assert.equal(authCases.length, scope === 'auth-only' ? 1 : 0)
    if (scope === 'auth-only') assert.equal(files.length, 1)
    if (scope === 'profile-history') assert.equal(files.length, 2)
  }
})
