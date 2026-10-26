import fs from 'node:fs'
import path from 'node:path'

const specFiles = Object.freeze([
  'connected.spec.js',
  'catalogue-evidence.spec.js',
  'catalogue-readonly.spec.js',
  'profile-history-readonly.spec.js'
])
const testStatuses = Object.freeze({
  passed: 'PASS',
  failed: 'FAIL',
  timedOut: 'FAIL',
  interrupted: 'FAIL',
  skipped: 'SKIPPED'
})
const runStatuses = new Set(['passed', 'failed', 'timedout', 'interrupted'])
const publicSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value) ? value : null

// Playwright reporter for connected checks. Only source case IDs and fixed
// outcomes are retained; test titles, errors, stdout and attachments are private.
export default class RedactedReleaseReporter {
  constructor({
    env = process.env,
    rootDirectory = process.cwd(),
    fileSystem = fs,
    writeOutput = value => process.stdout.write(value)
  } = {}) {
    this.fileSystem = fileSystem
    this.writeOutput = writeOutput
    this.directory = path.resolve(rootDirectory,
      typeof env.RELEASE_EVIDENCE_DIRECTORY === 'string' && env.RELEASE_EVIDENCE_DIRECTORY.trim()
        ? env.RELEASE_EVIDENCE_DIRECTORY : 'artifacts/connected-release')
    this.allowedFiles = new Map(specFiles.map(file =>
      [path.resolve(rootDirectory, 'release-check', file), file]))
    this.metadata = { releaseSha: publicSha(env.RELEASE_SHA), candidateSha: publicSha(env.GITHUB_SHA) }
    this.cases = new Map()
    this.blockers = new Set()
    if (!this.metadata.releaseSha) this.block('RELEASE_IDENTITY_MISSING')
    this.discovered = 0
    this.invalidEvents = 0
    this.runnerErrors = 0
    this.started = false
  }

  block(code) {
    this.blockers.add(code)
  }

  caseId(test) {
    const location = test?.location
    if (typeof location?.file !== 'string' ||
        !Number.isSafeInteger(location.line) || location.line < 1 || location.line > 100000) return null
    const file = this.allowedFiles.get(path.resolve(location.file))
    return file ? file + ':' + location.line : null
  }

  onBegin(_config, suite) {
    if (this.started) {
      this.block('DUPLICATE_BEGIN')
      return
    }
    this.started = true
    try {
      const tests = suite.allTests()
      if (!Array.isArray(tests) || tests.length > 10000) {
        this.block('INVALID_SUITE')
        return
      }
      this.discovered = tests.length
      for (const test of tests) {
        const id = this.caseId(test)
        if (!id) {
          this.invalidEvents += 1
          this.block('INVALID_CASE_IDENTITY')
        } else if (this.cases.has(id)) {
          this.invalidEvents += 1
          this.block('DUPLICATE_CASE_IDENTITY')
        } else {
          this.cases.set(id, 'NOT_RUN')
        }
      }
    } catch {
      this.block('INVALID_SUITE')
    }
  }

  onTestEnd(test, result) {
    try {
      const id = this.caseId(test)
      if (!this.started || !id || !this.cases.has(id)) {
        this.invalidEvents += 1
        this.block('UNEXPECTED_CASE_RESULT')
        return
      }
      if (this.cases.get(id) !== 'NOT_RUN') {
        this.invalidEvents += 1
        this.cases.set(id, 'FAIL')
        this.block('DUPLICATE_CASE_RESULT')
        return
      }
      const status = result?.status
      if (typeof status !== 'string' || !Object.hasOwn(testStatuses, status)) {
        this.invalidEvents += 1
        this.cases.set(id, 'INVALID')
        this.block('INVALID_TEST_STATUS')
        return
      }
      this.cases.set(id, testStatuses[status])
    } catch {
      this.invalidEvents += 1
      this.block('INVALID_CASE_RESULT')
    }
  }

  onStdOut() {}
  onStdErr() {}

  onError() {
    this.runnerErrors += 1
    this.block('RUNNER_ERROR')
  }

  async onEnd(result) {
    let runnerStatus = 'unknown'
    try {
      const value = result?.status
      if (typeof value === 'string' && runStatuses.has(value)) runnerStatus = value
    } catch { /* Discard private runner exceptions. */ }
    if (runnerStatus === 'unknown') this.block('INVALID_RUN_STATUS')
    if (!this.started) this.block('MISSING_BEGIN')
    if (!this.discovered) this.block('NO_TESTS_DISCOVERED')
    const tests = [...this.cases].sort(([left], [right]) => left.localeCompare(right))
      .map(([caseId, status]) => ({ caseId, status }))
    const counts = {
      expected: this.discovered,
      passed: tests.filter(test => test.status === 'PASS').length,
      failed: tests.filter(test => test.status === 'FAIL').length,
      skipped: tests.filter(test => test.status === 'SKIPPED').length,
      notRun: 0
    }
    counts.notRun = Math.max(0, counts.expected - counts.passed - counts.failed - counts.skipped)
    if (counts.notRun) this.block('INCOMPLETE_RESULTS')
    const report = {
      version: 1,
      qualification: 'CONNECTED_RELEASE_CHECKS',
      ...this.metadata,
      status: this.blockers.size ? 'BLOCKED'
        : runnerStatus !== 'passed' || counts.failed > 0 ? 'FAIL'
          : counts.skipped > 0 ? 'PASS_WITH_SKIPS' : 'PASS',
      runnerStatus,
      counts,
      invalidEvents: this.invalidEvents,
      runnerErrors: this.runnerErrors,
      blockers: [...this.blockers].sort(),
      tests
    }
    const blockReport = code => {
      if (!report.blockers.includes(code)) report.blockers.push(code)
      report.blockers.sort()
      report.status = 'BLOCKED'
    }
    const write = () => {
      const file = path.join(this.directory, 'release-summary.json')
      this.fileSystem.mkdirSync(this.directory, { recursive: true })
      this.fileSystem.writeFileSync(file + '.tmp', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
      this.fileSystem.renameSync(file + '.tmp', file)
    }
    try {
      write()
    } catch {
      blockReport('REPORT_WRITE_FAILED')
    }
    try {
      this.writeOutput(JSON.stringify(report) + '\n')
    } catch {
      blockReport('REPORT_OUTPUT_FAILED')
      try { write() } catch { blockReport('REPORT_WRITE_FAILED') }
    }
    return {
      status: ['PASS', 'PASS_WITH_SKIPS'].includes(report.status) && runnerStatus === 'passed'
        ? 'passed' : 'failed'
    }
  }

  printsToStdio() {
    // Prevent Playwright from adding a default reporter that prints errors.
    return true
  }
}
