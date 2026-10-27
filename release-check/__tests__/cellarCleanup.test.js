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
      checkpoint: async () => {},
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
      checkpoint: async () => {},
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


const recordedFixture = ({ checkpoint: persist = async () => {}, ...overrides } = {}) => {
  const calls = [], records = []
  let present = false
  const options = {
    productId: 4, marker,
    checkpoint: async (state) => { records.push(state); await persist(state) },
    readOwnerCellar: async () => {
      calls.push('GET')
      return { status: 200, body: { items: present ? [...baseline, created] : baseline } }
    },
    submit: async (record) => {
      calls.push('POST')
      present = true
      await record('create-response', 201)
      return { status: 201, body: receipt }
    },
    verify: async () => {},
    remove: async (_id, record) => {
      calls.push('DELETE')
      present = false
      await record('delete-response', 204)
      return 204
    },
    ...overrides
  }
  return { options, calls, records }
}

test('a missing durable writer prohibits even the first owner read', async () => {
  const item = recordedFixture()
  delete item.options.checkpoint
  await assert.rejects(withCellarCleanup(item.options), /durable encrypted checkpoint/)
  assert.deepEqual(item.calls, [])
})

test('intent and original acknowledgement are persisted before create and owner verification respectively', async () => {
  const item = recordedFixture()
  item.options.submit = async (record) => {
    assert.equal(item.records.at(-1).stage, 'create-intent')
    assert.equal(item.records.at(-1).marker, marker)
    assert.deepEqual(item.records.at(-1).beforeIds, ['1', '2'])
    assert.equal(item.records.at(-1).createsAttempted, 0)
    await record('create-response', 201)
    return { status: 201, body: receipt }
  }
  let reads = 0
  item.options.readOwnerCellar = async () => {
    reads += 1
    if (reads === 2) {
      assert.equal(item.records.at(-1).stage, 'owner-confirmation-start')
      const acknowledgement = item.records.find(({ stage }) => stage === 'create-acknowledged')
      assert.equal(acknowledgement.createdId, '99')
      assert.deepEqual(acknowledgement.receiptBody, receipt)
    }
    return { status: 200, body: { items: [2, 3].includes(reads) ? [...baseline, created] : baseline } }
  }
  await withCellarCleanup(item.options)
  const final = item.records.at(-1)
  assert.equal(final.status, 'PASS')
  assert.equal(final.createsAttempted, 1)
  assert.equal(final.deletesAttempted, 1)
  assert.equal(final.cleanup, 'PASS')
})

test('failed create-intent persistence never issues POST or DELETE', async () => {
  const item = recordedFixture({ checkpoint: async ({ stage }) => {
    if (stage === 'create-intent') throw new Error('Intent disk unavailable')
  } })
  await assert.rejects(withCellarCleanup(item.options), /Intent disk unavailable/)
  assert.deepEqual(item.calls, ['GET'])
  assert.equal(item.records.at(-1).createsAttempted, 0)
  assert.equal(item.records.at(-1).checkpoint, 'FAIL')
})

test('failed acknowledgement persistence prevents later verification or deletion', async () => {
  const item = recordedFixture({
    checkpoint: async ({ stage }) => { if (stage === 'create-acknowledged') throw new Error('ACK disk unavailable') },
    verify: async () => assert.fail('ACK must be durable first.')
  })
  await assert.rejects(withCellarCleanup(item.options), /ACK disk unavailable/)
  assert.deepEqual(item.calls, ['GET', 'POST'])
  assert.equal(item.records.at(-1).createdId, '99')
  assert.equal(item.records.at(-1).deletesAttempted, 0)
})

test('HTTP status survives a malformed create response before an ID can be acknowledged', async () => {
  const item = recordedFixture({
    submit: async (record) => {
      await record('create-response', 201)
      throw new Error('Malformed response JSON')
    }
  })
  await assert.rejects(withCellarCleanup(item.options), /Malformed response JSON/)
  const final = item.records.at(-1)
  assert.equal(final.createStatus, 201)
  assert.equal(final.createdId, null)
  assert.equal(final.marker, marker)
  assert.equal(final.createsAttempted, 1)
  assert.equal(final.deletesAttempted, 0)
})

test('failed owner read after acknowledged create retains exact original correlation without guessing cleanup', async () => {
  let reads = 0
  const item = recordedFixture({
    readOwnerCellar: async () => {
      if (++reads > 1) throw new Error('Owner read unavailable')
      return { status: 200, body: { items: baseline } }
    }
  })
  await assert.rejects(withCellarCleanup(item.options), /Owner read unavailable/)
  const final = item.records.at(-1)
  assert.equal(final.createdId, '99')
  assert.deepEqual(final.receiptBody, receipt)
  assert.equal(final.cleanup, 'NOT_RUN')
  assert.equal(final.deletesAttempted, 0)
})

test('a phase checkpoint failure remains latched and cannot authorise a later cleanup mutation', async () => {
  let failed = false
  const item = recordedFixture({
    checkpoint: async ({ stage }) => {
      if (stage === 'owner-update-response' && !failed) { failed = true; throw new Error('Phase evidence unavailable') }
    },
    verify: async (_body, _id, record) => {
      await record('owner-update-intent')
      await record('owner-update-response', 200)
    }
  })
  await assert.rejects(withCellarCleanup(item.options), (error) => {
    assert.equal(error instanceof AggregateError, true)
    assert.match(error.errors[0].message, /Phase evidence unavailable/)
    assert.match(error.errors[1].message, /blocked after an evidence-write failure/)
    return true
  })
  assert.equal(item.calls.filter((method) => method === 'DELETE').length, 0)
  assert.equal(item.records.at(-1).checkpoint, 'FAIL')
})

test('a failed delete intent cannot send DELETE even for a verified fixture', async () => {
  const item = recordedFixture({ checkpoint: async ({ stage }) => {
    if (stage === 'delete-intent') throw new Error('Delete receipt unavailable')
  } })
  await assert.rejects(withCellarCleanup(item.options), /Delete receipt unavailable/)
  assert.equal(item.calls.filter((method) => method === 'DELETE').length, 0)
  assert.equal(item.records.at(-1).deletesAttempted, 0)
})

test('an uncertain DELETE is attempted once and leaves cleanup explicitly unconfirmed', async () => {
  const item = recordedFixture({ remove: async () => { throw new Error('DELETE connection lost') } })
  await assert.rejects(withCellarCleanup(item.options), /DELETE connection lost/)
  const final = item.records.at(-1)
  assert.equal(final.deletesAttempted, 1)
  assert.equal(final.cleanup, 'UNCONFIRMED')
  assert.equal(final.createdId, '99')
})

test('a final evidence failure preserves confirmed cleanup and never issues a second DELETE', async () => {
  const item = recordedFixture({ checkpoint: async ({ stage }) => {
    if (stage === 'finished') throw new Error('Final evidence unavailable')
  } })
  await assert.rejects(withCellarCleanup(item.options), /Final evidence unavailable/)
  assert.equal(item.calls.filter((method) => method === 'DELETE').length, 1)
  assert.equal(item.records.at(-1).cleanup, 'PASS')
  assert.equal(item.records.find(({ stage }) => stage === 'cleanup-passed').cleanup, 'PASS')
})

test('phase records distinguish one owner update from two cross-owner denial requests', async () => {
  const item = recordedFixture({ verify: async (_body, _id, record) => {
    await record('owner-update-intent')
    await record('owner-update-response', 200)
    await record('other-owner-update-intent')
    await record('other-owner-update-response', 403)
    await record('other-owner-delete-intent')
    await record('other-owner-delete-response', 403)
  } })
  await withCellarCleanup(item.options)
  assert.equal(item.records.at(-1).ownerUpdatesAttempted, 1)
  assert.equal(item.records.at(-1).denialMutationRequests, 2)
  assert.deepEqual(item.records.at(-1).events.filter(({ httpStatus }) => httpStatus === 403), [
    { phase: 'other-owner-update-response', httpStatus: 403 },
    { phase: 'other-owner-delete-response', httpStatus: 403 }
  ])
})

test('a repeated mutation intent never reaches a second caller write', async () => {
  let writes = 0
  const item = recordedFixture({ verify: async (_body, _id, record) => {
    await record('owner-update-intent')
    writes += 1
    await record('owner-update-intent')
    writes += 1
  } })
  await assert.rejects(withCellarCleanup(item.options), /cannot be retried/)
  assert.equal(writes, 1)
  assert.equal(item.calls.filter(method => method === 'DELETE').length, 1)
})
