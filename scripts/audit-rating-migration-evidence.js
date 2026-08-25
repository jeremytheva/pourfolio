import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SCHEMA = 'pourfolio.rating-migration-evidence.v1'
const SHA256 = /^[0-9a-f]{64}$/
const FULL_SHA = /^[0-9a-f]{40}$/
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{2,199}$/
const SAFE_ACTOR = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/
const SENSITIVE = /(?:bearer\s|password|secret|token\s*[=:]|api[_-]?key|cookie|session\s*[=:])/i

const canonicalise = (value) => {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalise(value[key])]))
  }
  return value
}

const digest = (value) => createHash('sha256').update(value).digest('hex')
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype

const add = (blockers, code, field) => blockers.push({ code, field })

const exactKeys = (value, expected, field, blockers) => {
  if (!isPlainObject(value)) {
    add(blockers, 'INVALID_OBJECT', field)
    return false
  }
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    add(blockers, 'UNEXPECTED_OR_MISSING_FIELDS', field)
    return false
  }
  return true
}

const requireRef = (value, field, blockers) => {
  if (typeof value !== 'string' || !SAFE_REF.test(value) || value.includes('@') || value.includes('?') || SENSITIVE.test(value)) {
    add(blockers, 'INVALID_SAFE_REFERENCE', field)
  }
}

const requireText = (value, field, blockers) => {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 120 || /[\u0000-\u001f\u007f]/.test(value) || SENSITIVE.test(value)) {
    add(blockers, 'INVALID_SAFE_TEXT', field)
  }
}

const requireActor = (value, field, blockers) => {
  if (typeof value !== 'string' || !SAFE_ACTOR.test(value) || SENSITIVE.test(value)) add(blockers, 'INVALID_ACTOR_REFERENCE', field)
}

const scanSensitive = (value, field, blockers) => {
  if (typeof value === 'string') {
    if (value.includes('@') || value.includes('\n') || value.includes('\r') || SENSITIVE.test(value)) add(blockers, 'SENSITIVE_OR_UNREDACTED_VALUE', field)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSensitive(item, `${field}[${index}]`, blockers))
    return
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) scanSensitive(item, field ? `${field}.${key}` : key, blockers)
  }
}

export const auditRatingMigrationEvidence = (manifest) => {
  const blockers = []
  if (!exactKeys(manifest, ['schema', 'releaseSha', 'environment', 'provider', 'recovery', 'postMigration', 'connectedContract', 'approvals'], 'manifest', blockers)) {
    return { schema: SCHEMA, status: 'BLOCKED', blockerCount: blockers.length, blockers, manifestSha256: null }
  }

  if (manifest.schema !== SCHEMA) add(blockers, 'UNSUPPORTED_SCHEMA', 'schema')
  if (typeof manifest.releaseSha !== 'string' || !FULL_SHA.test(manifest.releaseSha)) add(blockers, 'INVALID_RELEASE_SHA', 'releaseSha')
  if (manifest.environment !== 'isolated-staging') add(blockers, 'INVALID_ENVIRONMENT', 'environment')

  if (exactKeys(manifest.provider, ['tenantRef', 'schemaMechanism', 'bulkDataMechanism', 'changeTicketRef', 'schemaPlanRef', 'backfillPlanRef', 'permissionPolicyRef'], 'provider', blockers)) {
    requireRef(manifest.provider.tenantRef, 'provider.tenantRef', blockers)
    requireRef(manifest.provider.changeTicketRef, 'provider.changeTicketRef', blockers)
    requireRef(manifest.provider.schemaPlanRef, 'provider.schemaPlanRef', blockers)
    requireRef(manifest.provider.backfillPlanRef, 'provider.backfillPlanRef', blockers)
    requireRef(manifest.provider.permissionPolicyRef, 'provider.permissionPolicyRef', blockers)
    for (const name of ['schemaMechanism', 'bulkDataMechanism']) {
      const mechanism = manifest.provider[name]
      if (exactKeys(mechanism, ['name', 'version', 'authorityRef'], `provider.${name}`, blockers)) {
        requireText(mechanism.name, `provider.${name}.name`, blockers)
        requireText(mechanism.version, `provider.${name}.version`, blockers)
        requireRef(mechanism.authorityRef, `provider.${name}.authorityRef`, blockers)
      }
    }
  }

  if (exactKeys(manifest.recovery, ['backupExportRef', 'isolatedRestoreRef', 'restoreSmokeRef', 'rollbackRehearsalRef'], 'recovery', blockers)) {
    for (const key of Object.keys(manifest.recovery)) requireRef(manifest.recovery[key], `recovery.${key}`, blockers)
  }

  if (exactKeys(manifest.postMigration, ['schemaAudit', 'dataExportSha256', 'finalSchemaExportRef', 'finalDataExportRef', 'countReconciliationRef', 'existingRatingsReadable'], 'postMigration', blockers)) {
    requireRef(manifest.postMigration.finalSchemaExportRef, 'postMigration.finalSchemaExportRef', blockers)
    requireRef(manifest.postMigration.finalDataExportRef, 'postMigration.finalDataExportRef', blockers)
    requireRef(manifest.postMigration.countReconciliationRef, 'postMigration.countReconciliationRef', blockers)
    if (typeof manifest.postMigration.dataExportSha256 !== 'string' || !SHA256.test(manifest.postMigration.dataExportSha256)) add(blockers, 'INVALID_SHA256', 'postMigration.dataExportSha256')
    if (manifest.postMigration.existingRatingsReadable !== true) add(blockers, 'EXISTING_RATINGS_NOT_VERIFIED', 'postMigration.existingRatingsReadable')
    if (exactKeys(manifest.postMigration.schemaAudit, ['status', 'blockerCount', 'schemaSha256'], 'postMigration.schemaAudit', blockers)) {
      if (manifest.postMigration.schemaAudit.status !== 'PASS') add(blockers, 'SCHEMA_AUDIT_NOT_PASS', 'postMigration.schemaAudit.status')
      if (manifest.postMigration.schemaAudit.blockerCount !== 0) add(blockers, 'SCHEMA_AUDIT_HAS_BLOCKERS', 'postMigration.schemaAudit.blockerCount')
      if (typeof manifest.postMigration.schemaAudit.schemaSha256 !== 'string' || !SHA256.test(manifest.postMigration.schemaAudit.schemaSha256)) add(blockers, 'INVALID_SHA256', 'postMigration.schemaAudit.schemaSha256')
    }
  }

  if (exactKeys(manifest.connectedContract, ['status', 'artifactRef', 'cleanupVerified'], 'connectedContract', blockers)) {
    if (manifest.connectedContract.status !== 'PASS') add(blockers, 'CONNECTED_CONTRACT_NOT_PASS', 'connectedContract.status')
    if (manifest.connectedContract.cleanupVerified !== true) add(blockers, 'CONNECTED_CLEANUP_NOT_VERIFIED', 'connectedContract.cleanupVerified')
    requireRef(manifest.connectedContract.artifactRef, 'connectedContract.artifactRef', blockers)
  }

  if (exactKeys(manifest.approvals, ['migrationOwner', 'securityDataApprover', 'releaseApprover', 'independentReviewer', 'approvalRef'], 'approvals', blockers)) {
    for (const key of ['migrationOwner', 'securityDataApprover', 'releaseApprover', 'independentReviewer']) requireActor(manifest.approvals[key], `approvals.${key}`, blockers)
    requireRef(manifest.approvals.approvalRef, 'approvals.approvalRef', blockers)
    const reviewer = manifest.approvals.independentReviewer
    for (const key of ['migrationOwner', 'securityDataApprover', 'releaseApprover']) {
      if (reviewer && reviewer === manifest.approvals[key]) add(blockers, 'INDEPENDENT_REVIEW_REQUIRED', `approvals.${key}`)
    }
  }

  scanSensitive(manifest, '', blockers)
  blockers.sort((a, b) => a.code.localeCompare(b.code) || a.field.localeCompare(b.field))
  const canonical = JSON.stringify(canonicalise(manifest))
  return {
    schema: SCHEMA,
    status: blockers.length ? 'BLOCKED' : 'PASS',
    blockerCount: blockers.length,
    blockers,
    manifestSha256: digest(canonical)
  }
}

const parseArgs = (args) => {
  const options = {}
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]?.startsWith('--') ? args[index].slice(2) : ''
    const value = args[index + 1]
    if (!['manifest', 'output'].includes(name) || !value || options[name]) throw new Error('Use unique --manifest <path> and optional --output <path> arguments.')
    options[name] = value
  }
  if (!options.manifest) throw new Error('--manifest is required.')
  return options
}

export const runCli = (args) => {
  const options = parseArgs(args)
  const manifestPath = path.resolve(options.manifest)
  const bytes = fs.readFileSync(manifestPath)
  const manifest = JSON.parse(bytes.toString('utf8'))
  const audit = auditRatingMigrationEvidence(manifest)
  const report = {
    reportType: 'RATING_MIGRATION_EVIDENCE_AUDIT',
    source: { file: path.basename(manifestPath), bytes: bytes.byteLength, sha256: digest(bytes) },
    ...audit
  }
  const rendered = `${JSON.stringify(report, null, 2)}\n`
  if (options.output) fs.writeFileSync(path.resolve(options.output), rendered)
  process.stdout.write(rendered)
  return audit.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}
