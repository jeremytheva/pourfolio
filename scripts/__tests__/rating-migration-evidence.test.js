import assert from 'node:assert/strict'
import test from 'node:test'
import { auditRatingMigrationEvidence } from '../audit-rating-migration-evidence.js'

const hash = 'a'.repeat(64)
const base = () => ({
  schema: 'pourfolio.rating-migration-evidence.v1',
  releaseSha: '1'.repeat(40),
  environment: 'isolated-staging',
  provider: {
    tenantRef: 'ncb:54026_rating-staging',
    schemaMechanism: { name: 'Managed schema change', version: 'v1', authorityRef: 'provider-docs:schema-v1' },
    bulkDataMechanism: { name: 'Managed bulk data job', version: 'v1', authorityRef: 'provider-docs:bulk-v1' },
    changeTicketRef: 'ticket:PF-123',
    schemaPlanRef: 'job:schema-001',
    backfillPlanRef: 'job:backfill-001',
    permissionPolicyRef: 'policy:rating-v1'
  },
  recovery: {
    backupExportRef: 'backup:before-001',
    isolatedRestoreRef: 'restore:isolated-001',
    restoreSmokeRef: 'evidence:restore-smoke-001',
    rollbackRehearsalRef: 'evidence:rollback-001'
  },
  postMigration: {
    schemaAudit: { status: 'PASS', blockerCount: 0, schemaSha256: hash },
    dataExportSha256: 'b'.repeat(64),
    finalSchemaExportRef: 'export:schema-after-001',
    finalDataExportRef: 'export:data-after-001',
    countReconciliationRef: 'evidence:counts-001',
    existingRatingsReadable: true
  },
  connectedContract: {
    status: 'PASS',
    artifactRef: 'github-artifact:connected-provider-001',
    cleanupVerified: true
  },
  approvals: {
    migrationOwner: 'migration-owner',
    securityDataApprover: 'security-approver',
    releaseApprover: 'release-approver',
    independentReviewer: 'independent-reviewer',
    approvalRef: 'approval:rating-migration-001'
  }
})

test('complete redacted migration evidence passes deterministically', () => {
  const first = auditRatingMigrationEvidence(base())
  const second = auditRatingMigrationEvidence(base())
  assert.equal(first.status, 'PASS')
  assert.equal(first.blockerCount, 0)
  assert.match(first.manifestSha256, /^[0-9a-f]{64}$/)
  assert.equal(first.manifestSha256, second.manifestSha256)
})

test('missing provider authority and recovery evidence fail closed', () => {
  const manifest = base()
  delete manifest.provider.changeTicketRef
  manifest.recovery.backupExportRef = ''
  const result = auditRatingMigrationEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'UNEXPECTED_OR_MISSING_FIELDS'))
  assert.ok(result.blockers.some(({ field }) => field === 'recovery.backupExportRef'))
})

test('schema audit blockers and failed connected cleanup remain blocked', () => {
  const manifest = base()
  manifest.postMigration.schemaAudit.blockerCount = 2
  manifest.connectedContract.cleanupVerified = false
  const result = auditRatingMigrationEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'SCHEMA_AUDIT_HAS_BLOCKERS'))
  assert.ok(result.blockers.some(({ code }) => code === 'CONNECTED_CLEANUP_NOT_VERIFIED'))
})

test('release SHA, environment and export hashes are strict', () => {
  const manifest = base()
  manifest.releaseSha = 'abc'
  manifest.environment = 'production'
  manifest.postMigration.dataExportSha256 = 'not-a-hash'
  const result = auditRatingMigrationEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'INVALID_RELEASE_SHA'))
  assert.ok(result.blockers.some(({ code }) => code === 'INVALID_ENVIRONMENT'))
  assert.ok(result.blockers.some(({ code }) => code === 'INVALID_SHA256'))
})

test('independent reviewer cannot be an approval actor', () => {
  const manifest = base()
  manifest.approvals.independentReviewer = manifest.approvals.migrationOwner
  const result = auditRatingMigrationEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'INDEPENDENT_REVIEW_REQUIRED'))
})

test('unredacted or secret-like evidence values are rejected', () => {
  const manifest = base()
  manifest.provider.changeTicketRef = 'https://provider.example/change?token=raw-secret'
  manifest.approvals.migrationOwner = 'owner@example.com'
  const result = auditRatingMigrationEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'INVALID_SAFE_REFERENCE' || code === 'SENSITIVE_OR_UNREDACTED_VALUE'))
  assert.ok(result.blockers.some(({ field }) => field === 'approvals.migrationOwner'))
})

test('unexpected fields are blocked to keep the manifest privacy-minimised', () => {
  const manifest = base()
  manifest.rawRows = [{ email: 'person@example.com' }]
  const result = auditRatingMigrationEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'UNEXPECTED_OR_MISSING_FIELDS'))
})
