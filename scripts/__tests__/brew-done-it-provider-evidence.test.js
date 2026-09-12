import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { auditBrewDoneItProviderEvidence } from '../audit-brew-done-it-provider-evidence.js'

const hash = 'a'.repeat(64)
const pass = (suffix) => ({ status: 'PASS', evidenceRef: `evidence:${suffix}` })
const base = () => ({
  schema: 'pourfolio.brew-done-it-provider-evidence.v1',
  releaseSha: '1'.repeat(40),
  environment: 'isolated-staging',
  targetSchema: {
    schemaTargetRef: 'docs:brew-schema-v3',
    schemaTargetSha256: hash,
    collections: [
      'brew_done_it_games',
      'brew_done_it_rounds',
      'brew_done_it_guesses',
      'brew_done_it_deductions'
    ],
    legacyQuestionsExcluded: true
  },
  providerCapabilities: {
    create: pass('cap-create'),
    read: pass('cap-read'),
    update: pass('cap-update'),
    delete: pass('cap-delete'),
    filteredRead: pass('cap-filter'),
    pagination: pass('cap-pagination'),
    compareAndSet: pass('cap-cas')
  },
  idempotency: {
    challengeCreation: pass('id-create'),
    join: pass('id-join'),
    nextRound: pass('id-next-round'),
    deduction: pass('id-deduction'),
    formalOutcome: pass('id-outcome')
  },
  recovery: {
    backupOrDisposableRef: 'recovery:disposable-staging-001',
    restoreOrResetRef: 'recovery:reset-001',
    failureInjectionPlanRef: 'recovery:failure-plan-001',
    rollbackAbortRef: 'recovery:rollback-001'
  },
  permissions: {
    policyRef: 'policy:brew-v3',
    participantIsolationRef: 'evidence:participant-isolation',
    secretProjectionRef: 'evidence:secret-projection',
    selectorSheetRef: 'evidence:selector-sheet'
  },
  cleanup: {
    procedureRef: 'cleanup:brew-fixtures-v1',
    fixtureNamespaceRef: 'fixture:brew-evidence-v1',
    verificationRef: 'evidence:cleanup-verified'
  },
  approvals: {
    migrationOwner: 'migration-owner',
    securityDataApprover: 'security-approver',
    releaseApprover: 'release-approver',
    independentReviewer: 'independent-reviewer',
    approvalRef: 'approval:brew-provider-v3',
    providerMutationApproved: true
  }
})

test('complete redacted Brew provider evidence passes deterministically', () => {
  const first = auditBrewDoneItProviderEvidence(base())
  const second = auditBrewDoneItProviderEvidence(base())
  assert.equal(first.status, 'PASS')
  assert.equal(first.blockerCount, 0)
  assert.match(first.manifestSha256, /^[0-9a-f]{64}$/)
  assert.equal(first.manifestSha256, second.manifestSha256)
})

test('exact v3 collection target is mandatory and legacy questions are rejected', () => {
  const manifest = base()
  manifest.targetSchema.collections.push('brew_done_it_questions')
  manifest.targetSchema.legacyQuestionsExcluded = false
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'INVALID_COLLECTION_SET'))
  assert.ok(result.blockers.some(({ code }) => code === 'LEGACY_QUESTION_COLLECTION_INCLUDED'))
  assert.ok(result.blockers.some(({ code }) => code === 'LEGACY_QUESTION_COLLECTION_NOT_EXCLUDED'))
})

test('provider capabilities and idempotency identities must all have passing evidence', () => {
  const manifest = base()
  manifest.providerCapabilities.compareAndSet.status = 'UNKNOWN'
  manifest.idempotency.deduction.evidenceRef = ''
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ field }) => field === 'providerCapabilities.compareAndSet.status'))
  assert.ok(result.blockers.some(({ field }) => field === 'idempotency.deduction.evidenceRef'))
})

test('recovery permissions cleanup and explicit mutation approval fail closed when incomplete', () => {
  const manifest = base()
  manifest.recovery.rollbackAbortRef = ''
  manifest.permissions.secretProjectionRef = ''
  manifest.cleanup.verificationRef = ''
  manifest.approvals.providerMutationApproved = false
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ field }) => field === 'recovery.rollbackAbortRef'))
  assert.ok(result.blockers.some(({ field }) => field === 'permissions.secretProjectionRef'))
  assert.ok(result.blockers.some(({ field }) => field === 'cleanup.verificationRef'))
  assert.ok(result.blockers.some(({ code }) => code === 'PROVIDER_MUTATION_NOT_APPROVED'))
})

test('independent reviewer cannot also approve migration security or release', () => {
  const manifest = base()
  manifest.approvals.independentReviewer = manifest.approvals.releaseApprover
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code, field }) => code === 'INDEPENDENT_REVIEW_REQUIRED' && field === 'approvals.releaseApprover'))
})

test('secret-like and unredacted evidence values are rejected', () => {
  const manifest = base()
  manifest.permissions.policyRef = 'policy:token=raw-secret'
  manifest.approvals.migrationOwner = 'owner@example.com'
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'INVALID_SAFE_REFERENCE' || code === 'SENSITIVE_OR_UNREDACTED_VALUE'))
  assert.ok(result.blockers.some(({ field }) => field === 'approvals.migrationOwner'))
})

test('unexpected fields are blocked to keep evidence privacy-minimised', () => {
  const manifest = base()
  manifest.rawProviderResponse = { selected_product_id: 99 }
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'UNEXPECTED_OR_MISSING_FIELDS'))
})

test('CLI returns zero for passing evidence and non-zero for blocked evidence', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'brew-provider-evidence-'))
  const script = fileURLToPath(new URL('../audit-brew-done-it-provider-evidence.js', import.meta.url))
  const validPath = path.join(directory, 'valid.json')
  const blockedPath = path.join(directory, 'blocked.json')
  writeFileSync(validPath, JSON.stringify(base()))
  const blocked = base()
  blocked.approvals.providerMutationApproved = false
  writeFileSync(blockedPath, JSON.stringify(blocked))

  const valid = spawnSync(process.execPath, [script, '--manifest', validPath], { encoding: 'utf8' })
  const invalid = spawnSync(process.execPath, [script, '--manifest', blockedPath], { encoding: 'utf8' })
  assert.equal(valid.status, 0)
  assert.equal(JSON.parse(valid.stdout).status, 'PASS')
  assert.equal(invalid.status, 1)
  assert.equal(JSON.parse(invalid.stdout).status, 'BLOCKED')
})
