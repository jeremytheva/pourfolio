import assert from 'node:assert/strict'
import test from 'node:test'
import { claimNext, releaseNext, activeClaims, ClaimConflict, StaleState, mutateLedger, githubClaimStore } from '../scripts/automation-coordination.mjs'

const timestamp = Date.parse('2026-10-15T12:00:00.000Z')
const empty = () => ({ version: 1, claims: {} })
const scope = (owner, workstream, issue, surfaces, pr = null) => ({ owner, workstream, issue, surfaces, pr })

test('one owner wins same issue, PR or surface; unrelated work can proceed', () => {
  const a = claimNext(empty(), scope('task-A', 'rating', 503, ['rating-gateway'], 637), timestamp)
  for (const blocked of [
    scope('task-B', 'producer', 503, ['producer-ui']),
    scope('task-B', 'producer', 441, ['producer-ui'], 637),
    scope('task-B', 'producer', 441, ['rating-gateway'])
  ]) assert.throws(() => claimNext(a, blocked, timestamp), ClaimConflict)
  const b = claimNext(a, scope('task-B', 'producer', 441, ['producer-ui'], 639), timestamp)
  assert.equal(Object.keys(b.claims).length, 2)
})

test('live leases cannot be stolen, renewals retain acquisition; stale leases expire and release is fenced', () => {
  const a = claimNext(empty(), scope('first-run', 'rating', 503, ['rating-gateway']), timestamp, 60000)
  assert.throws(() => claimNext(a, scope('other-run', 'rating', 503, ['rating-gateway']), timestamp + 1000), ClaimConflict)
  assert.throws(() => releaseNext(a, 'rating', 'other-run', timestamp), ClaimConflict)
  const renewed = claimNext(a, scope('first-run', 'rating', 503, ['rating-gateway']), timestamp + 1000, 60000)
  assert.equal(renewed.claims.rating.acquiredAt, a.claims.rating.acquiredAt)
  const recovered = claimNext(renewed, scope('other-run', 'rating', 503, ['rating-gateway']), timestamp + 62000)
  assert.equal(recovered.claims.rating.owner, 'other-run')
  assert.equal(Object.keys(releaseNext(recovered, 'rating', 'other-run', timestamp + 62001).claims).length, 0)
})

test('expired leases are pruned, malformed ledger fails closed and overlong claims are rejected', () => {
  const first = claimNext(empty(), scope('first-run', 'rating', 503, ['rating-gateway']), timestamp, 1)
  assert.equal(Object.keys(activeClaims(first, timestamp + 2)).length, 0)
  assert.throws(() => activeClaims({ version: 0, claims: {} }), /fail closed/)
  assert.throws(() => claimNext(empty(), scope('first-run', 'rating', 503, ['rating-gateway']), timestamp, 99999999), /Lease/)
})

test('CAS collision re-reads and denies stolen work rather than overwriting', async () => {
  let sha = 'base'
  let document = empty()
  let collide = true
  const store = {
    async read() { return { sha, document: structuredClone(document) } },
    async write(next, expected) {
      if (collide) { collide = false; document = claimNext(document, scope('rival', 'rating', 503, ['rating-gateway']), timestamp); sha = 'rival' }
      if (sha !== expected) { const e = new Error('stale'); e.code = 'STALE_SHA'; throw e }
      document = structuredClone(next); sha = 'next'
    }
  }
  await assert.rejects(() => mutateLedger(store, current => claimNext(current, scope('first', 'rating', 503, ['rating-gateway']), timestamp)), ClaimConflict)
  assert.equal(document.claims.rating.owner, 'rival')
})

test('partial ambiguous commit resolves through readback without duplicate writes', async () => {
  let document = empty(), sha = 'old', writes = 0
  const store = {
    async read() { return { document: structuredClone(document), sha } },
    async write(next) { document = structuredClone(next); sha = 'new'; writes++; const err = new Error('lost response'); err.code = 'UNCERTAIN_WRITE'; throw err }
  }
  const result = await mutateLedger(store, current => claimNext(current, scope('runner', 'brew', 637, ['brew']), timestamp))
  assert.equal(result.document.claims.brew.owner, 'runner')
  assert.equal(writes, 1)
})

test('bounded collisions cannot run forever', async () => {
  let readCount = 0
  const store = { async read() { readCount++; return { document: empty(), sha: 'sha' } }, async write() { const e = new Error('stale'); e.code = 'STALE_SHA'; throw e } }
  await assert.rejects(mutateLedger(store, d => claimNext(d, scope('runner', 'rating', 503, ['rating']), timestamp), { maxAttempts: 2 }), StaleState)
  assert.equal(readCount, 4)
})

test('GitHub transport classifies access denial without retrying writes', async () => {
  let requests = 0
  const store = githubClaimStore({ repository: 'jeremytheva/pourfolio', token: 'test-not-real', fetchImpl: async () => { requests++; return { status: 403, ok: false } } })
  await assert.rejects(store.write(empty(), 'sha'), /GitHub access denied/)
  assert.equal(requests, 1)
})

test('malformed lease never silently expires out of coordination', () => {
  assert.throws(() => activeClaims({ version: 1, claims: { rating: { owner: 'someone', expiresAt: 'nonsense' } } }), /fail closed/)
})

test('invalid GitHub 422 is not mistaken for a recoverable stale revision', async () => {
  let calls = 0
  const store = githubClaimStore({ repository: 'jeremytheva/pourfolio', token: 'test-not-real', fetchImpl: async () => { calls++; return { status: 422, ok: false } } })
  await assert.rejects(store.write(empty(), 'blob'), /HTTP 422/)
  assert.equal(calls, 1)
})
