import assert from 'node:assert/strict'
import test from 'node:test'
import { newCellarCleanupId, withCellarCleanup } from '../cellarCleanup.js'

const receipt = { item: { id: 99, product_id: 4, quantity: 1 } }
const baseline = [{ id: 1, product_id: 4 }, { id: 2, product_id: 5 }]
const created = { id: 99, product_id: 4, quantity: 1 }
const validScope = { productId: 4, beforeIds: [1, 2] }

test('only a new canonical cellar ID tied to the intended product is eligible for cleanup', () => {
  assert.equal(newCellarCleanupId(receipt, validScope), '99')
  for (const invalid of [
    null,
    { item: null },
    { item: { id: 1, product_id: 4 } },
    { item: { id: 99, product_id: 3 } },
    { item: { id: '099', product_id: 4 } },
    { item: { id: '99/other', product_id: 4 } },
    { item: { id: Number.MAX_SAFE_INTEGER + 1, product_id: 4 } }
  ]) assert.equal(newCellarCleanupId(invalid, validScope), null)
  assert.equal(newCellarCleanupId(receipt, { ...validScope, beforeIds: [1, 99] }), null)
})

const fixture = (overrides = {}) => {
  const calls = []
  let reads = 0
  return {
    calls,
    options: {
      productId: 4,
      readOwnerCellar: async () => {
        reads += 1
        calls.push('owner-read:' + reads)
        return { status: 200, body: { items: reads === 2 ? [...baseline, created] : baseline } }
      },
      submit: async () => { calls.push('submit'); return { status: 201, body: receipt } },
      verify: async (_body, id) => { calls.push('verify:' + id) },
      remove: async (id) => { calls.push('delete:' + id); return 204 },
      ...overrides
    }
  }
}

test('verified owner-baseline, new receipt, exact owner readback and delete are required in order', async () => {
  const { calls, options } = fixture()
  await withCellarCleanup(options)
  assert.deepEqual(calls, ['owner-read:1', 'submit', 'owner-read:2', 'verify:99', 'delete:99', 'owner-read:3'])
})

test('a failed owner baseline prohibits any create or cleanup', async () => {
  const { calls, options } = fixture({
    readOwnerCellar: async () => ({ status: 503, body: null })
  })
  await assert.rejects(withCellarCleanup(options), /baseline must load/)
  assert.deepEqual(calls, [])
})

test('an unknown, wrong-product or pre-existing receipt cannot authorise deletion', async () => {
  for (const body of [
    { item: {} },
    { item: { id: 1, product_id: 4 } },
    { item: { id: 99, product_id: 5 } },
    null
  ]) {
    const { calls, options } = fixture({
      submit: async () => { calls.push('submit'); return { status: 201, body } }
    })
    await assert.rejects(withCellarCleanup(options), /identity is unconfirmed/)
    assert.deepEqual(calls, ['owner-read:1', 'submit'])
  }
})

test('an unconfirmed owner-scoped GET never authorises deletion even for a new receipt ID', async () => {
  const { calls, options } = fixture({
    readOwnerCellar: async () => {
      calls.push('read')
      return { status: 200, body: { items: baseline } }
    }
  })
  await assert.rejects(withCellarCleanup(options), /not uniquely confirmed/)
  assert.equal(calls.filter((x) => x.startsWith('delete')).length, 0)
})

test('an interrupted create is not retried and cannot authorise guessed fixture cleanup', async () => {
  const { calls, options } = fixture({
    submit: async () => { calls.push('submit'); throw new Error('Provider result unknown') }
  })
  await assert.rejects(withCellarCleanup(options), /Provider result unknown/)
  assert.deepEqual(calls, ['owner-read:1', 'submit'])
})

test('failed verification still cleans an explicitly new owner-confirmed record', async () => {
  const { calls, options } = fixture({
    verify: async () => { calls.push('verify-failed'); throw new Error('Cross-account read failed') }
  })
  await assert.rejects(withCellarCleanup(options), /Cross-account read failed/)
  assert.deepEqual(calls, ['owner-read:1', 'submit', 'owner-read:2', 'verify-failed', 'delete:99', 'owner-read:3'])
})

test('HTTP 200 delete is not accepted as confirmed terminal cleanup', async () => {
  const { options } = fixture({ remove: async () => 200 })
  await assert.rejects(withCellarCleanup(options), /HTTP 204/)
})

test('owner list still containing the fixture after deletion rejects cleanup', async () => {
  let reads = 0
  const { options } = fixture({
    readOwnerCellar: async () => {
      reads += 1
      return { status: 200, body: { items: reads === 1 ? baseline : [...baseline, created] } }
    }
  })
  await assert.rejects(withCellarCleanup(options), /remains in owner history/)
})

test('both verification and cleanup failures remain inspectable', async () => {
  const { options } = fixture({
    verify: async () => { throw new Error('Verification error') },
    remove: async () => 502
  })
  await assert.rejects(withCellarCleanup(options), (error) => {
    assert.equal(error instanceof AggregateError, true)
    assert.match(error.errors[0].message, /Verification error/)
    assert.match(error.errors[1].message, /HTTP 204/)
    return true
  })
})
