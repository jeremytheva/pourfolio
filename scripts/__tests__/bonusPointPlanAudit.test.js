import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { auditBonusPointPlan, runBonusPointPlanCli } from '../audit-bonus-point-plan.js'

const fixture = () => ({
  plan: { version: 1, source_ref: 'private:reviewed-allocation', reviewer_ref: 'reviewer:approved',
    reviewed_at: '2026-10-24T00:00:00Z', attributes: [
      { id: '1', description: 'Existing global', point_value: '0.50' },
      { id: '2', description: 'Missing global', point_value: '0.25' }
    ] },
  snapshot: { version: 1, complete: true, environment_ref: 'private:current-instance',
    captured_at: '2026-10-24T00:00:00Z', attributes: [
      { id: 1, user_id: null, description: 'Existing global', point_value: '0.50' },
      { id: 2, user_id: '', description: 'Missing global', point_value: null },
      { id: 3, user_id: 'private-account', description: 'Private descriptor', point_value: 0.7 }
    ] }
})
const audit = ({ plan, snapshot, beforeSnapshot }, mode = 'preflight') => auditBonusPointPlan({
  planBytes: JSON.stringify(plan), snapshotBytes: JSON.stringify(snapshot),
  beforeSnapshotBytes: beforeSnapshot === undefined ? undefined : JSON.stringify(beforeSnapshot), mode
})
const verifyFixture = () => {
  const input = fixture()
  input.beforeSnapshot = structuredClone(input.snapshot)
  input.snapshot.captured_at = '2026-10-24T00:10:00Z'
  input.snapshot.attributes[1].point_value = '0.25'
  return input
}

test('preflight identifies only missing global fills and preserves every supplied input', () => {
  const input = fixture()
  const before = JSON.stringify(input)
  const result = audit(input)
  assert.equal(result.status, 'PASS')
  assert.equal(result.qualification, 'SOURCE_ONLY')
  assert.deepEqual(result.counts, { global: 2, private: 1, planned: 2, alreadyMatched: 1, missing: 1, proposedFills: 1 })
  assert.equal(JSON.stringify(input), before)
  const output = JSON.stringify(result)
  for (const privateValue of ['private-account', 'Private descriptor', 'reviewer:approved', 'private:reviewed-allocation']) {
    assert.equal(output.includes(privateValue), false)
  }
})

test('verify fails while a global value is absent, then verifies supplied post-fill agreement', () => {
  const input = verifyFixture()
  input.snapshot.attributes[1].point_value = null
  assert.ok(audit(input, 'verify').blockers.includes('GLOBAL_POINT_VALUES_STILL_MISSING'))
  input.snapshot.attributes[1].point_value = '0.25'
  const result = audit(input, 'verify')
  assert.equal(result.status, 'PASS')
  assert.equal(result.counts.missing, 0)
  assert.equal(result.counts.alreadyMatched, 2)
})

test('an existing explicit 0.50 cannot be overwritten by a conflicting reviewed value', () => {
  const input = fixture()
  input.plan.attributes[0].point_value = '0.20'
  assert.ok(audit(input).blockers.includes('EXPLICIT_POINT_VALUE_CONFLICT'))
  assert.equal(input.snapshot.attributes[0].point_value, '0.50')
})

test('complete coverage, exact descriptors and global ownership are mandatory', () => {
  for (const [change, code] of [
    [(input) => input.plan.attributes.pop(), 'GLOBAL_PLAN_INCOMPLETE'],
    [(input) => { input.plan.attributes[1].description += ' changed' }, 'DESCRIPTION_DRIFT'],
    [(input) => { input.plan.attributes[1].id = 3 }, 'PLAN_TARGET_NOT_GLOBAL'],
    [(input) => { delete input.snapshot.attributes[1].user_id }, 'SNAPSHOT_OWNERSHIP_UNCONFIRMED'],
    [(input) => { input.snapshot.complete = false }, 'COMPLETE_SNAPSHOT_REQUIRED'],
    [(input) => { input.plan.source_ref = '' }, 'REVIEWED_PLAN_INVALID'],
    [(input) => { input.plan.reviewer_ref = '' }, 'REVIEWED_PLAN_INVALID']
  ]) {
    const input = fixture()
    change(input)
    const result = audit(input)
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes(code), code)
  }
})

test('duplicate or unsafe identifiers cannot disguise incomplete coverage', () => {
  const first = fixture()
  first.plan.attributes.push({ ...first.plan.attributes[0] })
  assert.ok(audit(first).blockers.includes('PLAN_ID_INVALID_OR_DUPLICATED'))
  const second = fixture()
  second.snapshot.attributes.push({ ...second.snapshot.attributes[0] })
  assert.ok(audit(second).blockers.includes('SNAPSHOT_ID_INVALID_OR_DUPLICATED'))
  const third = fixture()
  third.plan.attributes[1].id = '9007199254740993'
  assert.ok(audit(third).blockers.includes('PLAN_ID_INVALID_OR_DUPLICATED'))
})

test('strict point validation rejects coercible types and unsupported decimal representations', () => {
  for (const value of [true, false, [], {}, '', ' ', null, undefined, 'NaN', 'Infinity', -0.1, '0x1', '1e-1', '0.251', 0.251]) {
    const input = fixture()
    input.plan.attributes[1].point_value = value
    assert.ok(audit(input).blockers.includes('PLAN_POINT_VALUE_INVALID'), String(value))
  }
  for (const value of [true, [], '0.251', 'bad']) {
    const input = fixture()
    input.snapshot.attributes[0].point_value = value
    assert.ok(audit(input).blockers.includes('STORED_POINT_VALUE_INVALID'), String(value))
  }
})

test('explicit zero and supported two-decimal values remain authoritative', () => {
  const input = fixture()
  input.plan.attributes[0].point_value = 0
  input.snapshot.attributes[0].point_value = '0.00'
  assert.equal(audit(input).status, 'PASS')
  input.beforeSnapshot = structuredClone(input.snapshot)
  input.snapshot.captured_at = '2026-10-24T00:10:00Z'
  input.snapshot.attributes[1].point_value = 0.25
  assert.equal(audit(input, 'verify').status, 'PASS')
})

test('fingerprints bind original bytes including whitespace without exposing contents', () => {
  const input = fixture()
  const planBytes = Buffer.from(JSON.stringify(input.plan, null, 2) + '\n', 'utf8')
  const snapshotBytes = Buffer.from(JSON.stringify(input.snapshot), 'utf8')
  const result = auditBonusPointPlan({ planBytes, snapshotBytes })
  assert.equal(result.planSha256, createHash('sha256').update(planBytes).digest('hex'))
  assert.equal(result.snapshotSha256, createHash('sha256').update(snapshotBytes).digest('hex'))
  const changed = auditBonusPointPlan({ planBytes: Buffer.concat([planBytes, Buffer.from(' ')]), snapshotBytes })
  assert.notEqual(changed.planSha256, result.planSha256)
})

test('malformed JSON and UTF-8 fail closed with static redacted error codes', () => {
  const result = auditBonusPointPlan({ planBytes: '{ private-account invalid', snapshotBytes: '{}' })
  assert.deepEqual(result.blockers, ['INPUT_JSON_OR_UTF8_INVALID'])
  assert.equal(JSON.stringify(result).includes('private-account'), false)
  assert.deepEqual(auditBonusPointPlan({ planBytes: Buffer.from([0xff]), snapshotBytes: '{}' }).blockers, ['INPUT_JSON_OR_UTF8_INVALID'])
  assert.throws(() => auditBonusPointPlan({ planBytes: '{}', snapshotBytes: '{}', mode: 'apply' }))
})

test('CLI reads only two supplied files and refuses apply or unknown flags before reading', () => {
  const input = fixture()
  const reads = []
  const readFile = (path) => {
    reads.push(path)
    return Buffer.from(JSON.stringify(path === 'plan.json' ? input.plan : input.snapshot))
  }
  const result = runBonusPointPlanCli(['--plan', 'plan.json', '--snapshot', 'snapshot.json'], readFile)
  assert.equal(result.status, 'PASS')
  assert.deepEqual(reads, ['plan.json', 'snapshot.json'])
  for (const args of [
    ['--plan', 'p', '--snapshot', 's', '--apply', 'yes'],
    ['--plan', 'p', '--snapshot', 's', '--mode', 'apply'],
    ['--plan', 'p', '--snapshot', 's', '--plan', 'other']
  ]) {
    const before = reads.length
    assert.throws(() => runBonusPointPlanCli(args, readFile))
    assert.equal(reads.length, before)
  }
})

test('distinct exact decimal amounts never compare equal through Number rounding', () => {
  for (const [stored, proposed] of [
    ['90071992547409.90', '90071992547409.91'],
    ['70368744177664.01', '70368744177664.02']
  ]) {
    const input = fixture()
    input.snapshot.attributes[0].point_value = stored
    input.plan.attributes[0].point_value = proposed
    const result = audit(input)
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes('EXPLICIT_POINT_VALUE_CONFLICT'))
  }
  const oversized = fixture()
  oversized.plan.attributes[1].point_value = '90071992547409.92'
  assert.ok(audit(oversized).blockers.includes('PLAN_POINT_VALUE_INVALID'))
})

test('verify requires before evidence and never accepts a post-only point match', () => {
  const input = verifyFixture()
  delete input.beforeSnapshot
  const result = audit(input, 'verify')
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('BEFORE_SNAPSHOT_REQUIRED'))
})

test('verify binds before bytes and reconciles only planned missing-global fills', () => {
  const input = verifyFixture()
  const original = JSON.stringify(input)
  const result = audit(input, 'verify')
  assert.equal(result.status, 'PASS')
  assert.equal(result.beforeSnapshotSha256, createHash('sha256').update(JSON.stringify(input.beforeSnapshot)).digest('hex'))
  assert.deepEqual(result.preservation, { status: 'PASS', rowsBefore: 3, rowsAfter: 3, expectedFills: 1, observedFills: 1 })
  assert.equal(JSON.stringify(input), original)
  input.snapshot.attributes.reverse()
  assert.equal(audit(input, 'verify').status, 'PASS')
})

test('verify rejects changes to any private row field without disclosing values', () => {
  for (const change of [
    (row) => { row.point_value = 0.1 },
    (row) => { row.user_id = 'different-private-owner' },
    (row) => { row.description = 'changed-private-description' },
    (row) => { row.extra_private_field = 'private-secret-sentinel' }
  ]) {
    const input = verifyFixture()
    change(input.snapshot.attributes[2])
    const result = audit(input, 'verify')
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes('UNEXPECTED_ATTRIBUTE_CHANGE'))
    for (const value of ['private-account', 'different-private-owner', 'Private descriptor', 'changed-private-description', 'private-secret-sentinel']) {
      assert.equal(JSON.stringify(result).includes(value), false)
    }
  }
})

test('verify rejects added, deleted or replaced private rows even when global points match', () => {
  for (const change of [
    (rows) => rows.pop(),
    (rows) => rows.push({ id: 4, user_id: 'another-private-owner', description: 'New private descriptor', point_value: 0.7 }),
    (rows) => { rows[2].id = 4 }
  ]) {
    const input = verifyFixture()
    change(input.snapshot.attributes)
    const result = audit(input, 'verify')
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes('ATTRIBUTE_SET_CHANGED'))
  }
})

test('verify preserves existing explicit globals and every other supplied global field', () => {
  const changedValue = verifyFixture()
  changedValue.plan.attributes[0].point_value = '0.20'
  changedValue.snapshot.attributes[0].point_value = '0.20'
  assert.ok(audit(changedValue, 'verify').blockers.includes('BEFORE_SNAPSHOT_OR_PLAN_INVALID'))
  for (const change of [
    (row) => { row.user_id = '' },
    (row) => { row.extra_provider_field = 'unexpected' },
    (row) => { row.id = '1' }
  ]) {
    const input = verifyFixture()
    change(input.snapshot.attributes[0])
    const result = audit(input, 'verify')
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes('UNEXPECTED_ATTRIBUTE_CHANGE'))
  }
})

test('verify refuses different environments, unordered captures and incomplete before snapshots', () => {
  for (const [change, code] of [
    [(input) => { input.beforeSnapshot.environment_ref = 'another-instance' }, 'SNAPSHOT_ENVIRONMENT_MISMATCH'],
    [(input) => { input.beforeSnapshot.captured_at = input.snapshot.captured_at }, 'SNAPSHOT_CAPTURE_ORDER_INVALID'],
    [(input) => { input.beforeSnapshot.captured_at = '2026-10-25T00:00:00Z' }, 'SNAPSHOT_CAPTURE_ORDER_INVALID'],
    [(input) => { input.beforeSnapshot.complete = false }, 'BEFORE_SNAPSHOT_OR_PLAN_INVALID'],
    [(input) => { input.beforeSnapshot.attributes.push({ ...input.beforeSnapshot.attributes[0] }) }, 'BEFORE_SNAPSHOT_OR_PLAN_INVALID']
  ]) {
    const input = verifyFixture()
    change(input)
    const result = audit(input, 'verify')
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes(code), code)
  }
})

test('verify fails closed for malformed before bytes and permits a verified no-op rerun', () => {
  const input = verifyFixture()
  for (const beforeSnapshotBytes of ['{ private-account invalid', Buffer.from([0xff])]) {
    const result = auditBonusPointPlan({ planBytes: JSON.stringify(input.plan), snapshotBytes: JSON.stringify(input.snapshot), beforeSnapshotBytes, mode: 'verify' })
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes('BEFORE_SNAPSHOT_OR_PLAN_INVALID'))
    assert.equal(JSON.stringify(result).includes('private-account'), false)
  }
  input.beforeSnapshot.attributes[1].point_value = '0.25'
  const result = audit(input, 'verify')
  assert.equal(result.status, 'PASS')
  assert.equal(result.preservation.expectedFills, 0)
  assert.equal(result.preservation.observedFills, 0)
})

test('CLI requires before snapshot only in verify mode and rejects bad flags before file access', () => {
  const input = verifyFixture()
  const reads = []
  const readFile = (path) => {
    reads.push(path)
    return JSON.stringify({ 'plan.json': input.plan, 'after.json': input.snapshot, 'before.json': input.beforeSnapshot }[path])
  }
  const result = runBonusPointPlanCli(['--plan', 'plan.json', '--snapshot', 'after.json', '--before-snapshot', 'before.json', '--mode', 'verify'], readFile)
  assert.equal(result.status, 'PASS')
  assert.deepEqual(reads, ['plan.json', 'after.json', 'before.json'])
  for (const args of [
    ['--plan', 'p', '--snapshot', 's', '--mode', 'verify'],
    ['--plan', 'p', '--snapshot', 's', '--before-snapshot', 'b'],
    ['--plan', 'p', '--snapshot', 's', '--before-snapshot', 'b', '--mode', 'verify', '--apply', 'yes'],
    ['--plan', 'p', '--snapshot', 's', '--mode', 'verify', '--before-snapshot', 'b', '--before-snapshot', 'other']
  ]) {
    const count = reads.length
    assert.throws(() => runBonusPointPlanCli(args, readFile))
    assert.equal(reads.length, count)
  }
})

test('a permitted fill cannot alter the other fields or hide a different mutation count', () => {
  const input = verifyFixture()
  input.snapshot.attributes[1].user_id = null
  const result = audit(input, 'verify')
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('UNEXPECTED_ATTRIBUTE_CHANGE'))
  assert.ok(result.blockers.includes('POINT_FILL_COUNT_MISMATCH'))
  assert.equal(result.preservation.expectedFills, 1)
  assert.equal(result.preservation.observedFills, 0)
})

test('verify requires all core fields even when both snapshots omit the same private field', () => {
  for (const key of ['description', 'point_value']) {
    const input = verifyFixture()
    delete input.beforeSnapshot.attributes[2][key]
    delete input.snapshot.attributes[2][key]
    const result = audit(input, 'verify')
    assert.equal(result.status, 'BLOCKED')
    assert.ok(result.blockers.includes('BEFORE_SNAPSHOT_ATTRIBUTE_FIELDS_INCOMPLETE'))
    assert.ok(result.blockers.includes('SNAPSHOT_ATTRIBUTE_FIELDS_INCOMPLETE'))
  }
})

test('before fingerprint uses original UTF-8 bytes and supports object-key reordering only', () => {
  const input = verifyFixture()
  const beforeSnapshotBytes = Buffer.from(JSON.stringify(input.beforeSnapshot, null, 2) + '\n')
  const row = input.snapshot.attributes[2]
  input.snapshot.attributes[2] = { point_value: row.point_value, description: row.description, user_id: row.user_id, id: row.id }
  const result = auditBonusPointPlan({ planBytes: JSON.stringify(input.plan), snapshotBytes: JSON.stringify(input.snapshot), beforeSnapshotBytes, mode: 'verify' })
  assert.equal(result.status, 'PASS')
  assert.equal(result.beforeSnapshotSha256, createHash('sha256').update(beforeSnapshotBytes).digest('hex'))
  assert.throws(() => auditBonusPointPlan({ planBytes: '{}', snapshotBytes: '{}', beforeSnapshotBytes, mode: 'preflight' }))
})
