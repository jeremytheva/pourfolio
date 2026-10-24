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
const audit = ({ plan, snapshot }, mode = 'preflight') => auditBonusPointPlan({
  planBytes: JSON.stringify(plan), snapshotBytes: JSON.stringify(snapshot), mode
})

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
  const input = fixture()
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
