import assert from 'node:assert/strict'
import test from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { summariseCellarIntegrity, probeExistingOwnedCellar } from '../audit-live-cellar-integrity.js'

const products = [{ id: 12 }, { id: 15 }]
const sample = { id: 7, user_id: 'owner-a', product_id: 12, quantity: '2', gift: '0' }

test('read-only cellar census counts owned and legacy rows without disclosing identities', () => {
  const summary = summariseCellarIntegrity({
    cellar: [sample, { id: 8, user_id: null, product_id: 15, quantity: null, gift: 0 }],
    products
  })
  assert.deepEqual(summary, {
    status: 'LEGACY_OWNERLESS_PRESENT',
    mode: 'read-only',
    rows: 2,
    productsExamined: 2,
    ownedRows: 1,
    ownerlessRows: 1,
    distinctOwners: 1,
    invalidOrDuplicateIds: 0,
    invalidProductReferences: 0,
    invalidQuantities: 0,
    unsupportedGiftFlags: 0
  })
  assert.equal(JSON.stringify(summary).includes('owner-a'), false)
  assert.equal(JSON.stringify(summary).includes('product_name'), false)
})

test('read-only cellar census is inconclusive with no rows', () => {
  const summary = summariseCellarIntegrity({ cellar: [], products })
  assert.equal(summary.status, 'INCONCLUSIVE_NO_CELLAR_ROWS')
})

test('read-only cellar census diagnoses missing products and duplicate or invalid row IDs', () => {
  const summary = summariseCellarIntegrity({
    cellar: [
      { id: 7, user_id: 'u1', product_id: 999, quantity: -1, gift: 'yes' },
      { id: 7, user_id: 'u1', product_id: '12', quantity: 1.5, gift: false },
      { id: 0, user_id: 'u2', product_id: null, gift: '0' }
    ],
    products
  })
  assert.equal(summary.status, 'REVIEW_REQUIRED')
  assert.equal(summary.invalidOrDuplicateIds, 2)
  assert.equal(summary.invalidProductReferences, 2)
  assert.equal(summary.invalidQuantities, 2)
  assert.equal(summary.unsupportedGiftFlags, 1)
  assert.equal(summary.distinctOwners, 2)
})

test('existing owned cellar record get/readback verifies identity, product, quantity and gift wire formats', async () => {
  const reads = []
  const provider = {
    async get(collection, id) {
      reads.push([collection, id])
      return { id: '7', user_id: 'owner-a', product_id: '12', quantity: 2, gift: 0 }
    }
  }
  const summary = await probeExistingOwnedCellar({ cellar: [sample], provider })
  assert.deepEqual(summary, { status: 'EXISTING_OWNED_ROW_READBACK_OK', checked: 1 })
  assert.deepEqual(reads, [[COLLECTIONS.cellar, 7]])
  assert.equal(JSON.stringify(summary).includes('owner-a'), false)
  assert.equal(JSON.stringify(summary).includes('7'), false)
})

test('existing owned cellar record rejects an incorrect owner or product without leaking details', async () => {
  for (const override of [
    { user_id: 'owner-b' },
    { product_id: 15 },
    { quantity: 8 },
    { gift: 1 }
  ]) {
    const provider = { get: async () => ({ ...sample, ...override }) }
    const result = await probeExistingOwnedCellar({ cellar: [sample], provider })
    assert.deepEqual(result, { status: 'READBACK_MISMATCH', checked: 1 })
  }
})

test('existing private cellar check records absence and provider read failures without mutations', async () => {
  let called = 0
  const provider = { get: async () => { called++; throw new Error('Secret provider diagnostic') } }
  const absent = await probeExistingOwnedCellar({ cellar: [{ id: 3, user_id: '', product_id: 12 }], provider })
  assert.deepEqual(absent, { status: 'INCONCLUSIVE_NO_OWNED_ROW', checked: 0 })
  assert.equal(called, 0)
  const bad = await probeExistingOwnedCellar({ cellar: [sample], provider })
  assert.deepEqual(bad, { status: 'READBACK_UNAVAILABLE', checked: 1 })
  assert.equal(JSON.stringify(bad).includes('Secret'), false)
})
