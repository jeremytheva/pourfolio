import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SCHEMA = 'pourfolio.brew-done-it-provider-evidence.v1'
const SHA256 = /^[0-9a-f]{64}$/
const FULL_SHA = /^[0-9a-f]{40}$/
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{2,199}$/
const SAFE_ACTOR = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/
const SENSITIVE = /(?:bearer\s|password\s*[=:]|secret(?:[_-]?key)?\s*[=:]|token\s*[=:]|api[_-]?key\s*[=:]|cookie\s*[=:]|session\s*[=:]|invitation[_-]?code\s*[=:])/i

const REQUIRED_COLLECTIONS = Object.freeze([
  'brew_done_it_deductions',
  'brew_done_it_games',
  'brew_done_it_guesses',
  'brew_done_it_rounds'
])

const CAPABILITIES = Object.freeze([
  'compareAndSet',
  'create',
  'delete',
  'filteredRead',
  'pagination',
  'read',
  'update'
])

const IDEMPOTENCY_IDENTITIES = Object.freeze([
  'challengeCreation',
  'deduction',
  'formalOutcome',
  'join',
  'nextRound'
])

const canonicalise = (value) => {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalise(value[key])]))
  }
  return value
}

const digest = (value) => createHash('sha256').update(value).digest('hex')
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
const hasControlCharacters = (value) => [...value].some((character) => {
  const codePoint = character.codePointAt(0)
  return codePoint <= 31 || codePoint === 127
})
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

const requireActor = (value, field, blockers) => {
  if (typeof value !== 'string' || !SAFE_ACTOR.test(value) || SENSITIVE.test(value)) add(blockers, 'INVALID_ACTOR_REFERENCE', field)
}

const requirePassEvidence = (value, field, blockers) => {
  if (!exactKeys(value, ['status', 'evidenceRef'], field, blockers)) return
  if (value.status !== 'PASS') add(blockers, 'EVIDENCE_NOT_PASS', `${field}.status`)
  requireRef(value.evidenceRef, `${field}.evidenceRef`, blockers)
}

const scanSensitive = (value, field, blockers) => {
  if (typeof value === 'string') {
    if (value.includes('@') || value.includes('\n') || value.includes('\r') || SENSITIVE.test(value)) {
      add(blockers, 'SENSITIVE_OR_UNREDACTED_VALUE', field)
    }
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

const validateCollectionTarget = (targetSchema, blockers) => {
  if (!exactKeys(targetSchema, ['schemaTargetRef', 'schemaTargetSha256', 'collections', 'legacyQuestionsExcluded'], 'targetSchema', blockers)) return
  requireRef(targetSchema.schemaTargetRef, 'targetSchema.schemaTargetRef', blockers)
  if (typeof targetSchema.schemaTargetSha256 !== 'string' || !SHA256.test(targetSchema.schemaTargetSha256)) {
    add(blockers, 'INVALID_SHA256', 'targetSchema.schemaTargetSha256')
  }
  if (!Array.isArray(targetSchema.collections)) {
    add(blockers, 'INVALID_COLLECTION_SET', 'targetSchema.collections')
  } else {
    const actual = [...new Set(targetSchema.collections)].sort()
    if (actual.length !== targetSchema.collections.length || actual.length !== REQUIRED_COLLECTIONS.length || actual.some((name, index) => name !== REQUIRED_COLLECTIONS[index])) {
      add(blockers, 'INVALID_COLLECTION_SET', 'targetSchema.collections')
    }
    if (targetSchema.collections.includes('brew_done_it_questions')) add(blockers, 'LEGACY_QUESTION_COLLECTION_INCLUDED', 'targetSchema.collections')
  }
  if (targetSchema.legacyQuestionsExcluded !== true) add(blockers, 'LEGACY_QUESTION_COLLECTION_NOT_EXCLUDED', 'targetSchema.legacyQuestionsExcluded')
}

export const auditBrewDoneItProviderEvidence = (manifest) => {
  const blockers = []
  if (!exactKeys(manifest, [
    'schema',
    'releaseSha',
    'environment',
    'targetSchema',
    'providerCapabilities',
    'idempotency',
    'recovery',
    'permissions',
    'cleanup',
    'approvals'
  ], 'manifest', blockers)) {
    return { schema: SCHEMA, status: 'BLOCKED', blockerCount: blockers.length, blockers, manifestSha256: null }
  }

  if (manifest.schema !== SCHEMA) add(blockers, 'UNSUPPORTED_SCHEMA', 'schema')
  if (typeof manifest.releaseSha !== 'string' || !FULL_SHA.test(manifest.releaseSha)) add(blockers, 'INVALID_RELEASE_SHA', 'releaseSha')
  if (manifest.environment !== 'isolated-staging') add(blockers, 'INVALID_ENVIRONMENT', 'environment')

  validateCollectionTarget(manifest.targetSchema, blockers)

  if (exactKeys(manifest.providerCapabilities, CAPABILITIES, 'providerCapabilities', blockers)) {
    for (const capability of CAPABILITIES) requirePassEvidence(manifest.providerCapabilities[capability], `providerCapabilities.${capability}`, blockers)
  }

  if (exactKeys(manifest.idempotency, IDEMPOTENCY_IDENTITIES, 'idempotency', blockers)) {
    for (const identity of IDEMPOTENCY_IDENTITIES) requirePassEvidence(manifest.idempotency[identity], `idempotency.${identity}`, blockers)
  }

  if (exactKeys(manifest.recovery, ['backupOrDisposableRef', 'restoreOrResetRef', 'failureInjectionPlanRef', 'rollbackAbortRef'], 'recovery', blockers)) {
    for (const key of Object.keys(manifest.recovery)) requireRef(manifest.recovery[key], `recovery.${key}`, blockers)
  }

  if (exactKeys(manifest.permissions, ['policyRef', 'participantIsolationRef', 'secretProjectionRef', 'selectorSheetRef'], 'permissions', blockers)) {
    for (const key of Object.keys(manifest.permissions)) requireRef(manifest.permissions[key], `permissions.${key}`, blockers)
  }

  if (exactKeys(manifest.cleanup, ['procedureRef', 'fixtureNamespaceRef', 'verificationRef'], 'cleanup', blockers)) {
    for (const key of Object.keys(manifest.cleanup)) requireRef(manifest.cleanup[key], `cleanup.${key}`, blockers)
  }

  if (exactKeys(manifest.approvals, [
    'migrationOwner',
    'securityDataApprover',
    'releaseApprover',
    'independentReviewer',
    'approvalRef',
    'providerMutationApproved'
  ], 'approvals', blockers)) {
    for (const key of ['migrationOwner', 'securityDataApprover', 'releaseApprover', 'independentReviewer']) {
      requireActor(manifest.approvals[key], `approvals.${key}`, blockers)
    }
    requireRef(manifest.approvals.approvalRef, 'approvals.approvalRef', blockers)
    if (manifest.approvals.providerMutationApproved !== true) add(blockers, 'PROVIDER_MUTATION_NOT_APPROVED', 'approvals.providerMutationApproved')
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
    if (!['manifest', 'output'].includes(name) || !value || options[name]) {
      throw new Error('Use unique --manifest <path> and optional --output <path> arguments.')
    }
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
  const audit = auditBrewDoneItProviderEvidence(manifest)
  const report = {
    reportType: 'BREW_DONE_IT_PROVIDER_EVIDENCE_AUDIT',
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

export const __testables = { REQUIRED_COLLECTIONS, CAPABILITIES, IDEMPOTENCY_IDENTITIES }
