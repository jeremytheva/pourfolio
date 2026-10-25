import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { auditBonusPointPlan } from './audit-bonus-point-plan.js'

const text = (value) => typeof value === 'string' && value.trim() !== ''
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const missing = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
const safeId = (value) => {
  const id = typeof value === 'number' ? String(value) : value
  return typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null
}
const hash = (value) => createHash('sha256').update(value).digest('hex')
const fail = (code) => { throw Object.assign(new Error(code), { code }) }
const diagnosticCodes = new Set(["PREFLIGHT_READ_CONFIGURATION_INVALID","PROVIDER_READ_UNCONFIRMED","PROVIDER_PAGINATION_INVALID","PROVIDER_COUNT_DRIFT","PROVIDER_ID_INVALID_OR_DUPLICATED","PROVIDER_OWNERSHIP_UNCONFIRMED","PROVIDER_ATTRIBUTE_FIELDS_INCOMPLETE","PROVIDER_PAGE_LIMIT_REACHED","PREFLIGHT_PLAN_BYTES_REQUIRED","PREFLIGHT_ARGUMENTS_NOT_SUPPORTED","PREFLIGHT_EXECUTION_GUARD_NOT_SATISFIED","PREFLIGHT_RUNTIME_CONFIGURATION_MISSING"])
const validCapture = (value) => text(value) && /Z$/.test(value) && Number.isFinite(Date.parse(value))

// A bounded, fresh pagination read establishes a complete enumeration, not an
// atomic provider snapshot or a backup suitable for irreversible migration.
export const readSnapshot = async (provider, {
  environmentRef, capturedAt = new Date().toISOString(), pageSize = 100, maxPages = 100
} = {}) => {
  if (typeof provider?.listPage !== 'function' || !text(environmentRef) || !validCapture(capturedAt) ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000) {
    fail('PREFLIGHT_READ_CONFIGURATION_INVALID')
  }
  const attributes = []
  const ids = new Set()
  let exactTotal
  let estimatedProgress = false
  for (let page = 1; page <= maxPages; page += 1) {
    let result
    try {
      result = await provider.listPage('bonus_attributes', {
        page, limit: pageSize, orderBy: 'id', order: 'asc', filters: {}, fresh: true
      })
    } catch {
      fail('PROVIDER_READ_UNCONFIRMED')
    }
    if (!record(result) || !Array.isArray(result.items) || result.page !== page || result.pageSize !== pageSize ||
        !Number.isSafeInteger(result.total) || result.total < 0 ||
        !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 ||
        (result.totalIsEstimate !== undefined && typeof result.totalIsEstimate !== 'boolean')) {
      fail('PROVIDER_PAGINATION_INVALID')
    }
    const estimated = result.totalIsEstimate === true
    if (estimated) {
      if (exactTotal !== undefined || result.items.length !== pageSize ||
          result.total !== page * pageSize + 1 || result.totalPages !== page + 1) {
        fail('PROVIDER_PAGINATION_INVALID')
      }
      estimatedProgress = true
    } else {
      if (exactTotal !== undefined && exactTotal !== result.total) fail('PROVIDER_COUNT_DRIFT')
      exactTotal = result.total
      const expectedPages = exactTotal === 0 ? 0 : Math.ceil(exactTotal / pageSize)
      const expectedLength = exactTotal === 0 ? 0
        : page < expectedPages ? pageSize : exactTotal - (expectedPages - 1) * pageSize
      const emptyEstimatedTerminal = estimatedProgress && result.items.length === 0 &&
        exactTotal === (page - 1) * pageSize && result.totalPages === page
      if ((!emptyEstimatedTerminal && (result.totalPages !== expectedPages || page > Math.max(1, expectedPages) ||
          result.items.length !== expectedLength)) || exactTotal > pageSize * maxPages) {
        fail('PROVIDER_PAGINATION_INVALID')
      }
    }
    for (const row of result.items) {
      const id = record(row) ? safeId(row.id) : null
      if (!id || ids.has(id)) fail('PROVIDER_ID_INVALID_OR_DUPLICATED')
      if (!Object.hasOwn(row, 'user_id') || !(row.user_id === null || typeof row.user_id === 'string')) {
        fail('PROVIDER_OWNERSHIP_UNCONFIRMED')
      }
      if (!text(row.description) || !Object.hasOwn(row, 'point_value')) fail('PROVIDER_ATTRIBUTE_FIELDS_INCOMPLETE')
      ids.add(id)
      attributes.push(structuredClone(row))
    }
    if (!estimated && page >= result.totalPages) {
      if (attributes.length !== exactTotal) fail('PROVIDER_COUNT_DRIFT')
      return { version: 1, complete: true, environment_ref: environmentRef, captured_at: capturedAt, attributes }
    }
  }
  fail('PROVIDER_PAGE_LIMIT_REACHED')
}

export const runBonusPointPreflight = async ({ provider, planBytes, environmentRef, capturedAt, pageSize, maxPages }) => {
  if (!(typeof planBytes === 'string' || Buffer.isBuffer(planBytes))) fail('PREFLIGHT_PLAN_BYTES_REQUIRED')
  const snapshot = await readSnapshot(provider, { environmentRef, capturedAt, pageSize, maxPages })
  const result = auditBonusPointPlan({ planBytes, snapshotBytes: JSON.stringify(snapshot) })
  const counts = { ...result.counts, globalMissingValues: 0, unresolvedPlanValues: 0, preservedMissingValues: 0 }
  const globals = new Map(snapshot.attributes.filter((row) => row.user_id === null || row.user_id.trim() === '')
    .map((row) => [safeId(row.id), row]))
  counts.globalMissingValues = [...globals.values()].filter((row) => missing(row.point_value)).length
  let plan
  try { plan = JSON.parse(planBytes.toString()) } catch { /* The shared auditor reports invalid JSON safely. */ }
  const blockers = [...result.blockers]
  const block = (code) => { if (!blockers.includes(code)) blockers.push(code) }
  if (Array.isArray(plan?.attributes)) {
    counts.unresolvedPlanValues = plan.attributes.filter((row) => record(row) && missing(row.point_value)).length
    const preservedIds = new Set()
    for (const row of plan.attributes) {
      if (!record(row) || preservedIds.has(safeId(row.id)) || row.value_source !== 'preserve-existing-explicit-provider-value') continue
      preservedIds.add(safeId(row.id))
      const target = globals.get(safeId(row.id))
      if (!target || missing(target.point_value)) {
        block('PRESERVED_VALUE_MISSING')
        counts.preservedMissingValues += 1
        if (target) {
          const one = auditBonusPointPlan({
            planBytes: JSON.stringify({ ...plan, attributes: [row] }),
            snapshotBytes: JSON.stringify({ ...snapshot, attributes: [target] })
          })
          counts.proposedFills = Math.max(0, counts.proposedFills - one.counts.proposedFills)
          counts.missing = Math.max(0, counts.missing - one.counts.missing)
        }
      } else {
        const one = auditBonusPointPlan({
          planBytes: JSON.stringify({ ...plan, attributes: [row] }),
          snapshotBytes: JSON.stringify({ ...snapshot, attributes: [target] })
        })
        if (one.blockers.includes('EXPLICIT_POINT_VALUE_CONFLICT') || one.blockers.includes('STORED_POINT_VALUE_INVALID')) {
          block('PRESERVED_VALUE_CONFLICT')
        }
      }
    }
  }
  return {
    ...result, status: blockers.length ? 'BLOCKED' : 'PASS',
    providerRead: 'READ_ONLY', snapshotScope: 'PAGINATION_COMPLETE_NOT_ATOMIC', counts, blockers
  }
}

// Import provider configuration only after all execution and source guards pass.
export const runBonusPointPreflightCli = async (args = process.argv.slice(2), {
  env = process.env, readFile = readFileSync,
  loadProvider = async () => (await import('../api/_lib/dataProvider.js')).dataProvider
} = {}) => {
  if (args.length) fail('PREFLIGHT_ARGUMENTS_NOT_SUPPORTED')
  if (env.RUN_LIVE_BONUS_POINT_PREFLIGHT !== '1' || !/^[a-f0-9]{40}$/.test(env.PREFLIGHT_CANDIDATE_SHA || '') ||
      env.PREFLIGHT_CANDIDATE_SHA !== env.GITHUB_SHA) fail('PREFLIGHT_EXECUTION_GUARD_NOT_SATISFIED')
  if (!['NOCODEBACKEND_DATA_BASE_URL', 'NOCODEBACKEND_INSTANCE', 'NOCODEBACKEND_SECRET_KEY'].every((key) => text(env[key]))) {
    fail('PREFLIGHT_RUNTIME_CONFIGURATION_MISSING')
  }
  const planBytes = readFile(new URL('../data/bonus_attribute_point_plan.json', import.meta.url))
  const environmentRef = 'sha256:' + hash(JSON.stringify([
    env.NOCODEBACKEND_DATA_BASE_URL.trim(), env.NOCODEBACKEND_INSTANCE.trim()
  ]))
  const result = await runBonusPointPreflight({ provider: await loadProvider(), planBytes, environmentRef })
  return { ...result, candidateCommit: env.PREFLIGHT_CANDIDATE_SHA }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runBonusPointPreflightCli()
    process.stdout.write(JSON.stringify(result) + '\n')
    if (result.status !== 'PASS') process.exitCode = 2
  } catch (error) {
    process.stdout.write(JSON.stringify({
      status: 'BLOCKED', qualification: 'SOURCE_ONLY', providerRead: 'READ_ONLY',
      error: diagnosticCodes.has(error?.code) ? error.code : 'BONUS_POINT_PREFLIGHT_UNCONFIRMED'
    }) + '\n')
    process.exitCode = 2
  }
}
