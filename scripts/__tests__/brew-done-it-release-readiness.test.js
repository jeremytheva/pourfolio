import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(root, 'scripts/check-brew-done-it-release-readiness.js')
const evidenceKeys = ['providerContract', 'twoAccountFlow', 'privacy', 'recovery', 'accessibility', 'cleanup']

const base = () => ({
  contract: 'pourfolio.brew-done-it-release-readiness.v1',
  candidateRevision: 'a'.repeat(40),
  evidence: Object.fromEntries(evidenceKeys.map((key) => [key, { status: 'PASS', reference: `evidence:${key}:001` }])),
  providerMutationApproved: true,
  enablementApproved: true
})

const run = (manifest) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'brew-release-readiness-'))
  const manifestPath = path.join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest))
  return spawnSync(process.execPath, [script, manifestPath], { cwd: root, encoding: 'utf8' })
}

test('complete attributable release evidence passes', () => {
  const result = run(base())
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /PASS: Brew Done It release readiness certified/)
})

test('every connected evidence category is independently fail-closed', () => {
  for (const key of evidenceKeys) {
    const manifest = base()
    manifest.evidence[key] = { status: 'PENDING', reference: 'PENDING' }
    const result = run(manifest)
    assert.notEqual(result.status, 0, `${key} unexpectedly passed`)
    assert.match(result.stderr, new RegExp(`${key} evidence is not attributable PASS evidence`))
  }
})

test('candidate revision must be an exact full commit SHA', () => {
  for (const revision of ['PENDING', 'abc1234', 'A'.repeat(40), 'g'.repeat(40), `${'a'.repeat(40)}extra`]) {
    const manifest = base()
    manifest.candidateRevision = revision
    const result = run(manifest)
    assert.notEqual(result.status, 0, `${revision} unexpectedly passed`)
    assert.match(result.stderr, /candidate revision must be a full lowercase 40-character commit SHA/)
  }
})

test('provider mutation and enablement approvals are separate mandatory gates', () => {
  for (const approval of ['providerMutationApproved', 'enablementApproved']) {
    const manifest = base()
    manifest[approval] = false
    const result = run(manifest)
    assert.notEqual(result.status, 0, `${approval} unexpectedly passed`)
  }
})

test('checked-in release-readiness template remains deliberately blocked', () => {
  const template = path.join(root, 'docs/nocodebackend/brew-done-it-release-readiness.template.json')
  const result = spawnSync(process.execPath, [script, template], { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /BLOCKED:/)
})
