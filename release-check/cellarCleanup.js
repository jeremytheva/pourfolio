import assert from 'node:assert/strict'

const canonicalId = (value) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null
  if (!['number', 'string'].includes(typeof value)) return null
  const id = String(value)
  return /^[1-9]\d*$/.test(id) ? id : null
}
const validMarker = (value) => typeof value === 'string' &&
  /^Pourfolio release QA cellar-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)

export const CELLAR_HTTP_PHASES = Object.freeze([
  'baseline-start', 'baseline-response', 'create-intent', 'create-response',
  'create-receipt', 'create-acknowledged', 'owner-confirmation-start', 'owner-confirmation-response',
  'owner-confirmed', 'verification-start', 'verification-passed', 'verification-failed',
  'owner-update-intent', 'owner-update-response', 'owner-update-confirmation-response',
  'other-owner-detail-response', 'other-owner-update-intent', 'other-owner-update-response',
  'other-owner-delete-intent', 'other-owner-delete-response', 'other-owner-list-response',
  'owner-denial-confirmation-response',
  'cleanup-check-start', 'cleanup-check-response', 'delete-intent', 'delete-response',
  'cleanup-confirmation-start', 'cleanup-confirmation-response', 'cleanup-passed',
  'cleanup-failed', 'finished'
])
const phases = new Set(CELLAR_HTTP_PHASES)
const mutationPhases = new Set([
  'create-intent', 'owner-update-intent', 'other-owner-update-intent',
  'other-owner-delete-intent', 'delete-intent'
])
const httpStatus = (value) => Number.isInteger(value) && value >= 100 && value <= 599

export const newCellarCleanupId = (payload, { productId, beforeIds, marker }) => {
  const itemId = canonicalId(payload?.item?.id)
  const expectedProduct = canonicalId(productId)
  if (!itemId || !expectedProduct || !validMarker(marker) || payload?.item?.notes !== marker ||
      canonicalId(payload?.item?.product_id) !== expectedProduct ||
      [...beforeIds].some((id) => String(id) === itemId)) return null
  return itemId
}

// A durable writer is required. Never discover cleanup identity from later
// histories after an unacknowledged create. Retain the original nonce/receipt,
// and recheck the exact owner/product/marker immediately before one DELETE.
export const withCellarCleanup = async ({
  productId, marker, checkpoint, submit, verify, remove, readOwnerCellar
}) => {
  assert.ok(validMarker(marker), 'Cellar cleanup requires a unique run marker before writing.')
  assert.ok(canonicalId(productId), 'Cellar cleanup requires a canonical product identifier.')
  assert.equal(typeof checkpoint, 'function', 'Cellar cleanup requires a durable encrypted checkpoint writer.')
  const state = {
    version: 1, kind: 'cellar-http-fixture-checkpoint-v1',
    productId: canonicalId(productId), marker, beforeIds: [], createdId: null,
    receiptBody: null, createStatus: null, deleteStatus: null,
    createsAttempted: 0, ownerUpdatesAttempted: 0, deletesAttempted: 0,
    denialMutationRequests: 0, verification: 'NOT_RUN', cleanup: 'NOT_RUN',
    checkpoint: 'PASS', status: 'RUNNING', events: []
  }
  const intended = new Set()
  let checkpointFailed = false
  const recordPhase = async (phase, status = null) => {
    assert.ok(phases.has(phase), 'Unknown cellar evidence phase.')
    assert.ok(status === null || httpStatus(status), 'Cellar HTTP status is invalid.')
    assert.ok(state.events.length < 64, 'Cellar evidence phase limit exceeded.')
    if (mutationPhases.has(phase)) {
      assert.equal(checkpointFailed, false, 'Cellar mutation is blocked after an evidence-write failure.')
      assert.equal(intended.has(phase), false, 'Cellar mutation phase cannot be retried.')
      intended.add(phase)
    }
    if (phase === 'create-response') state.createStatus = status
    if (phase === 'delete-response') state.deleteStatus = status
    state.events.push({ phase, httpStatus: status })
    try {
      await checkpoint(structuredClone({ ...state, stage: phase }))
    } catch (error) {
      checkpointFailed = true
      state.checkpoint = 'FAIL'
      throw error
    }
  }
  const responsePhase = async (phase, status) => {
    const previous = state.events.at(-1)
    if (previous?.phase !== phase || previous.httpStatus !== status) await recordPhase(phase, status)
  }
  const read = async (phase) => {
    const result = await readOwnerCellar(recordPhase, phase)
    await responsePhase(phase, result?.status ?? null)
    return result
  }
  const confirmsFixture = (items) => {
    const matches = items.filter((item) => String(item?.id) === state.createdId)
    return matches.length === 1 && canonicalId(matches[0]?.product_id) === state.productId &&
      matches[0]?.notes === marker
  }
  let verifiedOwned = false
  let verificationError = null
  let cleanupError = null
  let finalCheckpointError = null
  try {
    await recordPhase('baseline-start')
    const baseline = await read('baseline-response')
    assert.equal(baseline?.status, 200, 'Cellar owner baseline must load before writing.')
    assert.ok(Array.isArray(baseline?.body?.items), 'Cellar owner baseline must contain items.')
    assert.ok(!baseline.body.items.some((item) => item?.notes === marker), 'Cellar run marker already exists before writing.')
    state.beforeIds = baseline.body.items.map(({ id }) => String(id))

    await recordPhase('create-intent')
    state.createsAttempted = 1
    const receipt = await submit(recordPhase)
    if (state.createStatus !== null) assert.equal(receipt?.status, state.createStatus, 'Cellar create status evidence conflicts.')
    await responsePhase('create-response', receipt?.status ?? null)
    state.receiptBody = structuredClone(receipt?.body ?? null)
    if (receipt?.status === 201) {
      state.createdId = newCellarCleanupId(receipt.body, { productId, beforeIds: state.beforeIds, marker })
    }
    await recordPhase('create-receipt')
    assert.equal(receipt?.status, 201, 'The controlled cellar create must return HTTP 201.')
    assert.ok(state.createdId, 'New cellar fixture identity is unconfirmed; automatic cleanup is unsafe.')
    await recordPhase('create-acknowledged')

    await recordPhase('owner-confirmation-start')
    const ownerAfterCreate = await read('owner-confirmation-response')
    assert.equal(ownerAfterCreate?.status, 200, 'New cellar ownership could not be verified.')
    assert.ok(Array.isArray(ownerAfterCreate?.body?.items), 'New cellar ownership read did not return items.')
    assert.ok(confirmsFixture(ownerAfterCreate.body.items),
      'Created cellar ID and run marker are not uniquely confirmed on the owner account.')
    verifiedOwned = true
    await recordPhase('owner-confirmed')
    await recordPhase('verification-start')
    await verify(receipt.body, state.createdId, async (phase, status = null) => {
      await recordPhase(phase, status)
      if (phase === 'owner-update-intent') state.ownerUpdatesAttempted = 1
      if (['other-owner-update-intent', 'other-owner-delete-intent'].includes(phase)) state.denialMutationRequests += 1
    })
    state.verification = 'PASS'
    await recordPhase('verification-passed')
  } catch (error) {
    verificationError = error
    state.verification = 'FAIL'
    try { await recordPhase('verification-failed') } catch { /* Preserve the primary failure. */ }
  }

  if (state.createdId && verifiedOwned) {
    state.cleanup = 'UNCONFIRMED'
    try {
      await recordPhase('cleanup-check-start')
      const ownerBeforeDelete = await read('cleanup-check-response')
      assert.ok(ownerBeforeDelete?.status === 200 && Array.isArray(ownerBeforeDelete?.body?.items) &&
        confirmsFixture(ownerBeforeDelete.body.items),
      'Cellar fixture provenance changed or could not be confirmed before deletion.')
      await recordPhase('delete-intent')
      state.deletesAttempted = 1
      const status = await remove(state.createdId, recordPhase)
      await responsePhase('delete-response', status)
      assert.equal(status, 204, 'Exact cellar fixture deletion must return HTTP 204.')
      await recordPhase('cleanup-confirmation-start')
      const ownerAfterDelete = await read('cleanup-confirmation-response')
      assert.equal(ownerAfterDelete?.status, 200, 'Cellar cleanup owner read must succeed.')
      assert.ok(Array.isArray(ownerAfterDelete?.body?.items), 'Cellar cleanup owner read must contain items.')
      assert.equal(ownerAfterDelete.body.items.some(({ id }) => String(id) === state.createdId), false,
        'The exact cellar fixture remains in owner history after deletion.')
      state.cleanup = 'PASS'
      await recordPhase('cleanup-passed')
    } catch (error) {
      cleanupError = error
      try { await recordPhase('cleanup-failed') } catch { /* Preserve cleanup state and failure. */ }
    }
  }
  state.status = verificationError || cleanupError || checkpointFailed ? state.createsAttempted ? 'FAIL' : 'BLOCKED' : 'PASS'
  try { await recordPhase('finished') } catch (error) { finalCheckpointError = error }
  const failures = [verificationError, cleanupError, finalCheckpointError].filter(Boolean)
  if (failures.length > 1) throw new AggregateError(failures,
    'Cellar verification, cleanup or checkpoint evidence failed.', { cause: failures[0] })
  if (failures.length === 1) throw failures[0]
}
