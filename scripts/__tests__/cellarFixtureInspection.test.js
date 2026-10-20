import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectCellarCreateAttempt } from '../cellar-write-certification-lib.js'

const sourceSha = 'a'.repeat(40)
const receipt = { version: 1, kind: 'cellar-create-checkpoint', candidateCommit: sourceSha,
  stage: 'create-intent', createdId: null, createsAttempted: 0, userId: 'owner-a', productId: '1',
  runKey: 'cellar-12345678-1234-1234-1234-123456789abc',
  marker: 'Pourfolio release QA cellar-12345678-1234-1234-1234-123456789abc', baselineIds: ['5'] }
const summary = { candidateCommit: sourceSha, createsAttempted: 1, updatesAttempted: 0, deletesAttempted: 0 }
const row = { id: 6, user_id: 'owner-a', product_id: 1, notes: receipt.marker }
const provider = (items) => ({
  async listPage() { return { items, totalPages: 1 } },
  async get(_collection, id) { return items.find((value) => String(value.id) === String(id)) || null },
  async create() { throw new Error('writes forbidden') },
  async remove() { throw new Error('writes forbidden') }
})
const inspect = (items = [], changes = {}) => inspectCellarCreateAttempt({ provider: provider(items),
  freshProvider: provider(items), userId: 'owner-a', receipt, summary, sourceSha, ...changes })

test('original failed create with no new rows records bounded absence without any mutation', async () => {
  const { report } = await inspect([{ id: 5 }])
  assert.equal(report.status, 'INSPECTED')
  assert.equal(report.fixtureState, 'NO_NEW_FIXTURE_OBSERVED')
  assert.equal(report.deletesAttempted, 0)
})

test('exact original random marker requires new ID, owner/product and three-way read agreement', async () => {
  const { report, snapshot } = await inspect([{ id: 5 }, row])
  assert.equal(report.status, 'INSPECTED')
  assert.equal(report.fixtureState, 'EXACT_NONCE_FIXTURE_PRESENT')
  assert.equal(snapshot.fixture.id, 6)
  assert.ok(!JSON.stringify(report).includes(receipt.marker))
  assert.ok(!JSON.stringify(report).includes('owner-a'))
})

test('missing nonce on a new row, foreign owner and conflicting reads remain unconfirmed', async () => {
  for (const items of [[{ id: 6, notes: 'unattributed' }], [{ ...row, user_id: 'foreign-owner' }]]) {
    assert.equal((await inspect(items)).report.status, 'REVIEW_REQUIRED')
  }
  assert.equal((await inspect([row], { freshProvider: provider([{ ...row, product_id: 2 }]) })).report.status, 'REVIEW_REQUIRED')
})

test('wrong source, account, baseline or acknowledged-stage receipt blocks inspection', async () => {
  for (const changed of [{ candidateCommit: 'b'.repeat(40) }, { userId: 'foreign-owner' },
    { baselineIds: ['5', '5'] }, { stage: 'create-acknowledged', createdId: '6' }]) {
    await assert.rejects(inspect([], { receipt: { ...receipt, ...changed } }), { code: 'CELLAR_INSPECTION_SOURCE_UNCONFIRMED' })
  }
})
