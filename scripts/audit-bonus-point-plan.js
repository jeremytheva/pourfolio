import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

// Read-only offline evidence preparation: no provider access or apply mode.
// node scripts/audit-bonus-point-plan.js --plan /private/points.json --snapshot /private/bonus.json --mode preflight
// Verify with --mode verify --before-snapshot /private/before.json and a fresh post-backfill snapshot.
// Plan: {version:1,source_ref,reviewer_ref,reviewed_at,attributes:[{id,description,point_value}]}
// Snapshot: {version:1,complete:true,environment_ref,captured_at,attributes:[{id,user_id,description,point_value}]}
// Review/source references and completeness are supplied assertions, not independently certified evidence.
// No fallback values are inferred. This command cannot authorise mutation or certify public launch.

const text = (value) => typeof value === 'string' && value.trim().length > 0
const timestamp = (value) => text(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
const idOf = (value) => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? value : null
}
const missing = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
const pointOf = (value) => {
  if (!['number', 'string'].includes(typeof value)) return null
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(String(value))
  if (!match) return null
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'))
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? cents : null
}
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isBytes = (value) => typeof value === 'string' || Buffer.isBuffer(value)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const decodeJson = (bytes) => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(typeof bytes === 'string' ? Buffer.from(bytes) : bytes))
const completeAttributeFields = (rows) => rows.every((row) => isRecord(row) &&
  ['id', 'user_id', 'description', 'point_value'].every((field) => Object.hasOwn(row, field)) && text(row.description))

export const auditBonusPointPlan = ({ planBytes, snapshotBytes, beforeSnapshotBytes, mode = 'preflight' }) => {
  if (!['preflight', 'verify'].includes(mode)) throw new TypeError('Use preflight or verify mode.')
  if (![planBytes, snapshotBytes].every(isBytes)) {
    throw new TypeError('Original plan and snapshot UTF-8 bytes are required.')
  }
  if (mode === 'preflight' && beforeSnapshotBytes !== undefined) throw new TypeError('Before snapshot is used only in verify mode.')
  const result = {
    status: 'BLOCKED', mode, qualification: 'SOURCE_ONLY',
    planSha256: digest(planBytes), snapshotSha256: digest(snapshotBytes),
    counts: { global: 0, private: 0, planned: 0, alreadyMatched: 0, missing: 0, proposedFills: 0 },
    blockers: []
  }
  const block = (code) => { if (!result.blockers.includes(code)) result.blockers.push(code) }
  let plan
  let snapshot
  try {
    plan = decodeJson(planBytes)
    snapshot = decodeJson(snapshotBytes)
  } catch {
    block('INPUT_JSON_OR_UTF8_INVALID')
    return result
  }
  if (!isRecord(plan) || plan.version !== 1 || !text(plan.source_ref) || !text(plan.reviewer_ref) ||
      !timestamp(plan.reviewed_at) || !Array.isArray(plan.attributes) || plan.attributes.length === 0) {
    block('REVIEWED_PLAN_INVALID')
  }
  if (!isRecord(snapshot) || snapshot.version !== 1 || snapshot.complete !== true ||
      !text(snapshot.environment_ref) || !timestamp(snapshot.captured_at) ||
      !Array.isArray(snapshot.attributes) || snapshot.attributes.length === 0) {
    block('COMPLETE_SNAPSHOT_REQUIRED')
  }
  if (result.blockers.length) return result

  const globals = new Map()
  const allIds = new Set()
  for (const row of snapshot.attributes) {
    const id = isRecord(row) ? idOf(row.id) : null
    if (!id || allIds.has(id)) { block('SNAPSHOT_ID_INVALID_OR_DUPLICATED'); continue }
    allIds.add(id)
    if (!Object.hasOwn(row, 'user_id') ||
        !(row.user_id === null || typeof row.user_id === 'string')) {
      block('SNAPSHOT_OWNERSHIP_UNCONFIRMED')
      continue
    }
    if (row.user_id !== null && row.user_id.trim() !== '') { result.counts.private += 1; continue }
    result.counts.global += 1
    if (!text(row.description)) { block('SNAPSHOT_DESCRIPTION_INVALID'); continue }
    globals.set(id, row)
  }
  const plannedIds = new Set()
  for (const row of plan.attributes) {
    const id = isRecord(row) ? idOf(row.id) : null
    if (!id || plannedIds.has(id)) { block('PLAN_ID_INVALID_OR_DUPLICATED'); continue }
    plannedIds.add(id)
    result.counts.planned += 1
    const target = globals.get(id)
    if (!target) { block('PLAN_TARGET_NOT_GLOBAL'); continue }
    if (!text(row.description) || row.description !== target.description) {
      block('DESCRIPTION_DRIFT')
      continue
    }
    const proposed = pointOf(row.point_value)
    if (proposed === null) { block('PLAN_POINT_VALUE_INVALID'); continue }
    if (missing(target.point_value)) {
      result.counts.missing += 1
      result.counts.proposedFills += 1
    } else {
      const stored = pointOf(target.point_value)
      if (stored === null) block('STORED_POINT_VALUE_INVALID')
      else if (stored !== proposed) block('EXPLICIT_POINT_VALUE_CONFLICT')
      else result.counts.alreadyMatched += 1
    }
  }
  if (!globals.size || [...globals.keys()].some((id) => !plannedIds.has(id))) block('GLOBAL_PLAN_INCOMPLETE')
  if (mode === 'verify' && result.counts.missing > 0) block('GLOBAL_POINT_VALUES_STILL_MISSING')
  if (mode === 'verify') {
    result.preservation = { status: 'NOT_RUN', rowsBefore: null, rowsAfter: null, expectedFills: null, observedFills: null }
    if (!isBytes(beforeSnapshotBytes)) {
      block('BEFORE_SNAPSHOT_REQUIRED')
    } else {
      result.beforeSnapshotSha256 = digest(beforeSnapshotBytes)
      // Apply the same reviewed plan to both snapshots so it cannot rewrite an
      // existing explicit value or description merely by matching the after state.
      const beforeAudit = auditBonusPointPlan({ planBytes, snapshotBytes: beforeSnapshotBytes })
      if (beforeAudit.status !== 'PASS') {
        block('BEFORE_SNAPSHOT_OR_PLAN_INVALID')
      } else if (!result.blockers.length) {
        const before = decodeJson(beforeSnapshotBytes)
        result.preservation = {
          status: 'BLOCKED', rowsBefore: before.attributes.length, rowsAfter: snapshot.attributes.length,
          expectedFills: beforeAudit.counts.proposedFills, observedFills: 0
        }
        if (before.environment_ref !== snapshot.environment_ref) block('SNAPSHOT_ENVIRONMENT_MISMATCH')
        if (Date.parse(before.captured_at) >= Date.parse(snapshot.captured_at)) block('SNAPSHOT_CAPTURE_ORDER_INVALID')
        if (!completeAttributeFields(before.attributes)) block('BEFORE_SNAPSHOT_ATTRIBUTE_FIELDS_INCOMPLETE')
        if (!completeAttributeFields(snapshot.attributes)) block('SNAPSHOT_ATTRIBUTE_FIELDS_INCOMPLETE')
        const afterRows = new Map(snapshot.attributes.map((row) => [idOf(row.id), row]))
        if (before.attributes.length !== afterRows.size || before.attributes.some((row) => !afterRows.has(idOf(row.id)))) {
          block('ATTRIBUTE_SET_CHANGED')
        }
        for (const row of before.attributes) {
          const after = afterRows.get(idOf(row.id))
          if (!after) continue
          const global = row.user_id === null || row.user_id.trim() === ''
          const fill = global && missing(row.point_value)
          const expected = fill ? { ...row, point_value: after.point_value } : row
          if (!isDeepStrictEqual(after, expected)) block('UNEXPECTED_ATTRIBUTE_CHANGE')
          else if (fill) result.preservation.observedFills += 1
        }
        if (result.preservation.observedFills !== result.preservation.expectedFills) block('POINT_FILL_COUNT_MISMATCH')
        if (!result.blockers.length) result.preservation.status = 'PASS'
      }
    }
  }
  if (!result.blockers.length) result.status = 'PASS'
  return result
}

export const runBonusPointPlanCli = (args = process.argv.slice(2), readFile = readFileSync) => {
  const options = {}
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
    if (!['--plan', '--snapshot', '--before-snapshot', '--mode'].includes(key) || Object.hasOwn(options, key) ||
        !args[index + 1] || args[index + 1].startsWith('--')) {
      throw new TypeError('Use --plan FILE --snapshot FILE [--mode preflight|verify]; verify requires --before-snapshot FILE. No apply mode exists.')
    }
    options[key] = args[index + 1]
  }
  if (!options['--plan'] || !options['--snapshot']) throw new TypeError('Plan and snapshot files are required.')
  const mode = options['--mode'] || 'preflight'
  if (!['preflight', 'verify'].includes(mode)) throw new TypeError('Use preflight or verify mode.')
  if ((mode === 'verify') !== Boolean(options['--before-snapshot'])) {
    throw new TypeError('Before snapshot is required only in verify mode.')
  }
  return auditBonusPointPlan({
    planBytes: readFile(options['--plan']), snapshotBytes: readFile(options['--snapshot']),
    ...(mode === 'verify' ? { beforeSnapshotBytes: readFile(options['--before-snapshot']) } : {}), mode
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = runBonusPointPlanCli()
    process.stdout.write(JSON.stringify(result) + '\n')
    if (result.status !== 'PASS') process.exitCode = 2
  } catch {
    process.stderr.write(JSON.stringify({ status: 'BLOCKED', qualification: 'SOURCE_ONLY', error: 'BONUS_POINT_PLAN_AUDIT_FAILED' }) + '\n')
    process.exitCode = 1
  }
}
