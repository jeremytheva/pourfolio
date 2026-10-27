import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { evaluateModerationFixture, validateModerationTarget } from '../moderation-contract.js'

const contract = JSON.parse(fs.readFileSync(new URL('../../contracts/pourfolio-data-contract.json', import.meta.url), 'utf8'))
const target = contract.deferred_targets.catalogue_moderation
const fixture = (changes = {}) => ({ actor: 'Admin', actorId: 'verified-actor', entityType: 'product', entityId: '9007199254740993',
  action: 'approve', state: 'pending', exposure: 'normal', currentRecordVersion: 0, expectedRecordVersion: 0,
  currentContentVersion: 0, reviewedContentVersion: 0, producersApproved: true, evidence: true,
  fingerprint: 'a'.repeat(64), ...changes })
const evaluate = (changes) => evaluateModerationFixture(target, fixture(changes))

test('canonical moderation contract is deferred, unmapped and absent from live collections/writer permissions', () => {
  assert.deepEqual(validateModerationTarget(target), [])
  assert.equal(target.mutable_enabled, false)
  assert.equal(target.provider_mapping, null)
  for (const [name, record] of Object.entries(target.records)) {
    assert.equal(record.provider_collection, null)
    assert.equal(Object.hasOwn(contract.collections, `moderation_${name}`), false)
    assert.equal(Object.hasOwn(contract.external_writers['pourfolio-feeder'].collections, `moderation_${name}`), false)
  }
})

test('promotion, private/raw fields, erased version fences, unsafe legacy approval and removed safeguards fail contract validation', () => {
  for (const change of [(t) => { t.mutable_enabled = true }, (t) => { t.classification = 'DEPLOYED_REQUIRED' },
    (t) => { t.records.decision.logical_fields.push('raw_provider_body') }, (t) => { t.records.operation.unique_keys = [] },
    (t) => { t.versions.review_requires = ['content_version'] }, (t) => { t.verification.legacy_projection = 'approved' },
    (t) => { t.verification.pending_capabilities = ['view'] }, (t) => { t.verification_transitions[1].guards = ['evidence'] },
    (t) => { t.reliability.required_capabilities = [] }, (t) => { t.exposure.resubmission_preserves_restriction = false },
    (t) => { t.migration.schema_inventory = 'VERIFIED' }, (t) => { t.provider_mapping = { collection: 'guessed' } },
    (t) => { t.editable_fields.product.push('user_id') }, (t) => { t.producer_relationships.primary_count = 2 }]) {
    const changed = structuredClone(target); change(changed)
    assert.ok(validateModerationTarget(changed).length)
    assert.equal(evaluateModerationFixture(changed, fixture()).code, 'INVALID_TARGET')
  }
  for (const invalid of [null, {}, []]) assert.ok(validateModerationTarget(invalid).length)
})

test('product review requires exact current content and record versions plus approved producer dependencies', () => {
  assert.equal(evaluate().outcome, 'ELIGIBLE')
  assert.equal(evaluate({ currentRecordVersion: 1 }).code, 'STALE_REVIEW')
  assert.equal(evaluate({ currentContentVersion: 1 }).code, 'STALE_REVIEW')
  assert.equal(evaluate({ producersApproved: false }).outcome, 'DENIED')
  assert.equal(evaluate({ entityType: 'producer', producersApproved: false }).outcome, 'ELIGIBLE')
  assert.equal(evaluate({ evidence: false }).outcome, 'DENIED')
  assert.equal(evaluate({ state: 'unknown' }).code, 'MISSING_NEW_MODERATION')
  assert.equal(evaluate({ state: 'unknown', legacyPreActivation: true }).outcome, 'ELIGIBLE')
})

test('ordinary/unknown actors, unsupported actions and unsupported state transitions are denied', () => {
  for (const changes of [{ actor: 'User' }, { actor: 'admin' }, { actor: 'Admin ' }, { action: 'hard_delete' },
    { state: 'rejected' }, { state: 'approved' }]) assert.equal(evaluate(changes).outcome, 'DENIED')
  assert.equal(evaluate({ action: 'reject', reason: false }).outcome, 'DENIED')
  assert.equal(evaluate({ action: 'request_changes', reason: true }).nextState, 'needs_changes')
  assert.equal(evaluate({ action: 'reject', reason: true }).nextState, 'rejected')
})

test('resubmission requires the original submitter and a new revision, and cannot lift restriction', () => {
  const input = { actor: 'Submitter', action: 'resubmit', state: 'rejected', exposure: 'restricted', isSubmitter: true, newRevision: true }
  assert.deepEqual(evaluate(input), { outcome: 'ELIGIBLE', code: 'TARGET_TRANSITION', nextState: 'pending', exposure: 'restricted' })
  assert.equal(evaluate({ ...input, isSubmitter: false }).outcome, 'DENIED')
  assert.equal(evaluate({ ...input, newRevision: false }).outcome, 'DENIED')
  assert.equal(evaluate({ ...input, state: 'approved' }).outcome, 'DENIED')
})

test('correction and initialization do not bypass diff/evidence or consistent initialization guards', () => {
  const correction = { action: 'apply_correction', state: 'approved', reason: true, validatedDiff: true }
  assert.equal(evaluate(correction).outcome, 'ELIGIBLE')
  for (const changes of [{ validatedDiff: false }, { reason: false }, { evidence: false }, { producersApproved: false }]) {
    assert.equal(evaluate({ ...correction, ...changes }).outcome, 'DENIED')
  }
  assert.equal(evaluate({ actor: 'Submitter', action: 'initialize', state: 'absent' }).outcome, 'DENIED')
  assert.equal(evaluate({ actor: 'Submitter', action: 'initialize', state: 'absent', durableInitialization: true }).nextState, 'pending')
})

test('actor-scoped operation replay precedes stale review checks; uncertain results reconcile the original operation', () => {
  const operation = { actorId: 'verified-actor', fingerprint: 'a'.repeat(64), state: 'committed' }
  assert.equal(evaluate({ operation, currentRecordVersion: 1 }).outcome, 'REPLAY')
  assert.equal(evaluate({ operation, fingerprint: 'b'.repeat(64) }).code, 'KEY_INTENT_MISMATCH')
  assert.equal(evaluate({ operation: { ...operation, actorId: 'another-actor' } }).outcome, 'DENIED')
  assert.equal(evaluate({ operation, actor: 'User' }).outcome, 'DENIED')
  for (const state of ['prepared', 'committing', 'reconciling']) {
    assert.equal(evaluate({ operation: { ...operation, state } }).outcome, 'RECONCILE')
  }
  assert.equal(evaluate({ operation: { ...operation, state: 'blocked' } }).outcome, 'BLOCKED')
  assert.equal(evaluate({ operation: { ...operation, state: 'unknown' } }).outcome, 'DENIED')
})

test('large catalogue IDs stay exact strings, invalid identifiers/versions fail and fixtures never mutate inputs', () => {
  const input = Object.freeze(fixture())
  assert.equal(evaluateModerationFixture(target, input).outcome, 'ELIGIBLE')
  assert.equal(input.entityId, '9007199254740993')
  for (const changes of [{ entityId: 9007199254740992 }, { entityId: '01' }, { actorId: 'bad identity' },
    { currentRecordVersion: Number.MAX_SAFE_INTEGER }, { expectedRecordVersion: -1 }, { reviewedContentVersion: '0' },
    { exposure: 'approved' }, { fingerprint: 'browser-supplied' }]) assert.equal(evaluate(changes).outcome, 'DENIED')
  assert.equal(target.mutable_enabled, false)
})
