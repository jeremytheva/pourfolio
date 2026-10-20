import assert from 'node:assert/strict'
import test from 'node:test'
import { newCellarCleanupId, withCellarCleanup } from '../cellarCleanup.js'

const marker = 'Pourfolio release QA cellar-12345678-1234-1234-1234-123456789abc'
const receipt = { item: { id: 99, product_id: 4, quantity: 1, notes: marker } }
const baseline = [{ id: 1, product_id: 4 }, { id: 2, product_id: 5 }]
const created = { id: 99, product_id: 4, quantity: 1, notes: marker }
const validScope = { productId: 4, beforeIds: [1, 2], marker }

test('only a new canonical cellar ID tied to the intended product is eligible for cleanup', () => {
  assert.equal(newCellarCleanupId(receipt, validScope), '99')
  for (const invalid of [
    null,
    { item: null },
    { item: { id: 1, product_id: 4, notes: marker } },
    { item: { id: 99, product_id: 3, notes: marker } },
    { item: { id: '099', product_id: 4, notes: marker } },
    { item: { id: '99/other', product_id: 4, notes: marker } },
    { item: { id: Number.MAX_SAFE_INTEGER + 1, product_id: 4, notes: marker } }
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
      marker,
      readOwnerCellar: async () => {
        reads += 1
        calls.push('owner-read:' + reads)
        return { status: 200, body: { items: reads === 2 || reads === 3 ? [...baseline, created] : baseline } }
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
  assert.deepEqual(calls, ['owner-read:1', 'submit', 'owner-read:2', 'verify:99', 'owner-read:3', 'delete:99', 'owner-read:4'])
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
    { item: { id: 1, product_id: 4, notes: marker } },
    { item: { id: 99, product_id: 5, notes: marker } },
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
  assert.deepEqual(calls, ['owner-read:1', 'submit', 'owner-read:2', 'verify-failed', 'owner-read:3', 'delete:99', 'owner-read:4'])
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

test('missing or malformed run markers prevent any fixture work', async () => {
  for (const marker of [undefined, '', 'release-check', 'Pourfolio release QA cellar-not-a-uuid']) {
    const { calls, options } = fixture({ marker })
    await assert.rejects(withCellarCleanup(options), /unique run marker/)
    assert.deepEqual(calls, [])
    assert.equal(newCellarCleanupId(receipt, { ...validScope, marker }), null)
  }
})

test('a run marker already visible in the baseline prohibits a new mutation', async () => {
  const { calls, options } = fixture({
    readOwnerCellar: async () => ({ status: 200, body: { items: [created] } })
  })
  await assert.rejects(withCellarCleanup(options), /run marker already exists/)
  assert.deepEqual(calls, [])
})

test('a historical receipt omitted by the baseline cannot authorise deletion without this run marker', async () => {
  for (const notes of [undefined, 'Historical owner item', marker.replace('12345678', '87654321')]) {
    const historical = { ...created, notes }
    let writes = 0, deletes = 0
    await assert.rejects(withCellarCleanup({
      productId: 4, marker,
      readOwnerCellar: async () => ({ status: 200, body: { items: writes ? [historical] : [] } }),
      submit: async () => { writes += 1; return { status: 201, body: { item: historical } } },
      verify: async () => assert.fail('Unconfirmed history must not be updated.'),
      remove: async () => { deletes += 1; return 204 }
    }), /identity is unconfirmed/)
    assert.equal(writes, 1)
    assert.equal(deletes, 0)
  }
})

test('an echoed marker cannot bypass a conflicting owner readback or duplicate ID', async () => {
  for (const items of [
    [...baseline, { ...created, notes: 'Historical owner item' }],
    [...baseline, created, { ...created, notes: 'Conflicting historical item' }]
  ]) {
    let reads = 0, deletes = 0, writes = 0
    const { options } = fixture({
      readOwnerCellar: async () => ({ status: 200, body: { items: ++reads === 1 ? baseline : items } }),
      submit: async () => { writes += 1; return { status: 201, body: receipt } },
      remove: async () => { deletes += 1; return 204 }
    })
    await assert.rejects(withCellarCleanup(options), /not uniquely confirmed/)
    assert.equal(writes, 1)
    assert.equal(deletes, 0)
  }
})

test('cleanup rechecks exact owner fixture provenance after verification and before DELETE', async () => {
  for (const changed of [
    { status: 503, body: null },
    { status: 200, body: { items: baseline } },
    { status: 200, body: { items: [...baseline, { ...created, notes: 'Changed item' }] } },
    { status: 200, body: { items: [...baseline, { ...created, product_id: 5 }] } },
    { status: 200, body: { items: [...baseline, created, created] } }
  ]) {
    let reads = 0, deletes = 0
    const { options } = fixture({
      readOwnerCellar: async () => {
        reads += 1
        return reads === 3 ? changed : { status: 200, body: { items: reads === 1 ? baseline : [...baseline, created] } }
      },
      remove: async () => { deletes += 1; return 204 }
    })
    await assert.rejects(withCellarCleanup(options), /provenance changed or could not be confirmed/)
    assert.equal(reads, 3)
    assert.equal(deletes, 0)
  }
})

