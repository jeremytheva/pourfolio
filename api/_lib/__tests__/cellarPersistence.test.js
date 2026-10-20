import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { dataProvider } from '../dataProvider.js'
import handler, { projectCellarRecord, verifyPersistedCellar, verifyCellarRemoved, __testables } from '../../cellar-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const original = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, original))
const user = { id: 'owner-a' }
const product = { id: 12, product_name: 'Fixture beer', producer_id: null, product_category_id: null }
const existing = { id: 54, user_id: 'owner-a', product_id: 12, quantity: 2, date_received: '2026-10-15', gift: '0' }
const response = () => ({
  statusCode: null, body: null,
  setHeader() { return this },
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
  end() { return this }
})

test('cellar persists a verified private record using provider readback rather than a create echo', async () => {
  const requests = []
  dataProvider.create = async (collection, data) => {
    requests.push({ collection, data })
    return { id: 54 }
  }
  dataProvider.get = async (collection) => collection === COLLECTIONS.products
    ? product : { ...existing, quantity: '2' }
  const reply = response()
  await __testables.createCellar({ body: { product_id: 12, quantity: 2, date_received: '2026-10-15' } }, reply, user)
  assert.equal(reply.statusCode, 201)
  assert.equal(reply.body.item.quantity, '2')
  assert.equal(reply.body.item.gift, false)
  assert.equal(requests[0].data.user_id, user.id)
  assert.equal(requests[0].data.quantity, 2)
})

test('cellar creation refuses to acknowledge missing create identifier', async () => {
  dataProvider.create = async () => ({})
  dataProvider.get = async (collection) => collection === COLLECTIONS.products ? product : null
  const reply = response()
  await assert.rejects(
    __testables.createCellar({ body: { product_id: 12, quantity: 2 } }, reply, user),
    (error) => error.status === 502 && error.code === 'CELLAR_PERSISTENCE_MISMATCH'
  )
  assert.equal(reply.statusCode, null)
})

test('cellar create fails closed if persisted quantity or owner contradicts request', async () => {
  for (const mismatch of [{ quantity: '3' }, { user_id: 'owner-b' }]) {
    dataProvider.create = async () => ({ id: 54 })
    dataProvider.get = async (collection) => collection === COLLECTIONS.products
      ? product : { ...existing, ...mismatch }
    const reply = response()
    await assert.rejects(
      __testables.createCellar({ body: { product_id: 12, quantity: 2, date_received: '2026-10-15' } }, reply, user),
      (error) => error.status === 502 && error.code === 'CELLAR_PERSISTENCE_MISMATCH'
    )
    assert.equal(reply.statusCode, null)
  }
})

test('cellar update returns persisted values only after verified readback', async () => {
  let reads = 0
  dataProvider.get = async (collection) => {
    if (collection === COLLECTIONS.products) return product
    reads += 1
    return reads === 1 ? existing : { ...existing, quantity: '5', notes: 'Saved' }
  }
  dataProvider.update = async () => ({ id: 54, quantity: 5, user_id: 'forged-echo' })
  const reply = response()
  await __testables.updateCellar(54, { body: { quantity: 5, notes: 'Saved' } }, reply, user)
  assert.equal(reply.statusCode, 200)
  assert.equal(reply.body.item.quantity, '5')
  assert.equal(reply.body.item.notes, 'Saved')
  assert.equal(reads, 2)
})

test('cellar update does not return 200 for an echoed but unpersisted change', async () => {
  dataProvider.get = async (collection) => collection === COLLECTIONS.products ? product : existing
  dataProvider.update = async () => ({ id: 54, quantity: 5 })
  const reply = response()
  await assert.rejects(
    __testables.updateCellar(54, { body: { quantity: 5 } }, reply, user),
    (error) => error.status === 502 && error.code === 'CELLAR_PERSISTENCE_MISMATCH'
  )
  assert.equal(reply.statusCode, null)
})

test('cellar delete responds 204 only once the provider no longer returns the row', async () => {
  let reads = 0
  dataProvider.get = async () => (++reads === 1 ? existing : null)
  dataProvider.remove = async () => ({ deleted: true })
  const reply = response()
  await __testables.deleteCellar(54, reply, user)
  assert.equal(reply.statusCode, 204)
  assert.equal(reads, 2)
})

test('cellar delete does not report 204 when the provider still returns the row', async () => {
  dataProvider.get = async () => existing
  dataProvider.remove = async () => ({ deleted: true })
  const reply = response()
  await assert.rejects(__testables.deleteCellar(54, reply, user),
    (error) => error.status === 502 && error.code === 'CELLAR_DELETE_NOT_VERIFIED')
  assert.equal(reply.statusCode, null)
})

test('cellar verification accepts numeric wire strings and checks cleared null fields', async () => {
  const provider = { get: async () => ({ ...existing, mls: '375.0', gift: '0', notes: null }) }
  const saved = await verifyPersistedCellar({
    provider, id: 54, userId: 'owner-a',
    expected: { product_id: '12', mls: 375, quantity: 2, gift: 0, notes: null }
  })
  assert.equal(saved.id, 54)
  await assert.rejects(
    verifyPersistedCellar({ provider, id: 54, userId: 'owner-b', expected: {} }),
    (error) => error.code === 'CELLAR_PERSISTENCE_MISMATCH'
  )
})

test('cellar missing-row readback and persisted false gift strings do not fabricate success', async () => {
  const provider = { get: async () => null }
  await verifyCellarRemoved({ provider, id: 54 })
  await assert.rejects(
    verifyPersistedCellar({ provider, id: 54, userId: 'owner-a', expected: {} }),
    (error) => error.code === 'CELLAR_PERSISTENCE_MISMATCH'
  )
  assert.equal(projectCellarRecord({ id: 1, product_id: 2, gift: '0' }).gift, false)
  assert.equal(projectCellarRecord({ id: 1, product_id: 2, gift: '1' }).gift, true)
  assert.equal(projectCellarRecord({ id: 1, product_id: 2, gift: false }).gift, false)
})

test('cellar save verification rejects malformed or absent stored gift flags', async () => {
  for (const gift of ['invalid-provider-flag', 2, '2', {}, [], null, undefined, '']) {
    const provider = { get: async () => ({ ...existing, gift }) }
    await assert.rejects(
      verifyPersistedCellar({ provider, id: existing.id, userId: user.id, expected: { gift: 0 } }),
      (error) => error.code === 'CELLAR_PERSISTENCE_MISMATCH' &&
        error.mismatchFields.length === 1 && error.mismatchFields[0] === 'gift'
    )
  }
})

test('cellar save verification accepts supported persisted true and false encodings', async () => {
  for (const gift of [true, false, 1, 0, '1', '0', 'true', 'false']) {
    const expected = [true, 1, '1', 'true'].includes(gift) ? 1 : 0
    const provider = { get: async () => ({ ...existing, gift }) }
    const saved = await verifyPersistedCellar({
      provider, id: existing.id, userId: user.id, expected: { gift: expected }
    })
    assert.equal(saved.gift, gift)
  }
})

test('direct null lookup inputs use the client write projection rather than unavailable provider columns', async () => {
  let sent
  dataProvider.create = async (_collection, body) => { sent = body; return { id: 54 } }
  dataProvider.get = async (collection) => collection === COLLECTIONS.products ? product : existing
  const reply = response()
  await __testables.createCellar({ body: { product_id: 12, quantity: 2, date_received: '2026-10-15',
    location_id: null, sharing_series_id: null, series_version_id: null, purchase_location_id: null,
    purchased_by_id: null, bet_id: null } }, reply, user)
  assert.equal(reply.statusCode, 201)
  for (const field of ['location_id', 'sharing_series_id', 'series_version_id', 'purchase_location_id', 'purchased_by_id', 'bet_id']) {
    assert.equal(Object.hasOwn(sent, field), false)
    assert.equal(reply.body.item[field], null)
  }
})

test('partial updates omit unavailable null lookup fields without clearing existing provider relationships', async () => {
  let sent
  let reads = 0
  dataProvider.get = async (collection) => collection === COLLECTIONS.products ? product
    : ++reads === 1 ? existing : { ...existing, quantity: '5', series_edition_id: 18 }
  dataProvider.update = async (_collection, _id, body) => { sent = body; return { id: 54 } }
  const reply = response()
  await __testables.updateCellar(54, { body: { quantity: 5, series_version_id: null } }, reply, user)
  assert.equal(reply.statusCode, 200)
  assert.deepEqual(sent, { quantity: 5 })
})

test('lookup-only partial updates fail before provider mutation when no supported field remains', async () => {
  let writes = 0
  dataProvider.get = async () => existing
  dataProvider.update = async () => { writes += 1 }
  const reply = response()
  await assert.rejects(__testables.updateCellar(54, { body: { series_version_id: null } }, reply, user),
    (error) => error.status === 400)
  assert.equal(writes, 0)
  assert.equal(reply.statusCode, null)
})

test('bounded cellar settlement retries only fresh reads and accepts the stored update', async () => {
  let reads = 0
  const provider = { get: async (_collection, _id, options) => {
    assert.deepEqual(options, { fresh: true })
    reads += 1
    return { ...existing, quantity: reads === 1 ? 2 : 5 }
  } }
  const result = await verifyPersistedCellar({ provider, id: 54, userId: user.id,
    expected: { quantity: 5 }, attempts: 3, wait: async () => {} })
  assert.equal(result.quantity, 5)
  assert.equal(reads, 2)
})

test('bounded deletion settlement proves absence with reads and stops on changed ownership', async () => {
  let reads = 0
  const provider = { get: async (_collection, _id, options) => {
    assert.deepEqual(options, { fresh: true })
    return ++reads === 1 ? existing : null
  } }
  await verifyCellarRemoved({ provider, id: 54, userId: user.id, attempts: 3, wait: async () => {} })
  assert.equal(reads, 2)
  reads = 0
  await assert.rejects(verifyCellarRemoved({ provider: { get: async () => {
    reads += 1
    return { ...existing, user_id: 'foreign-owner' }
  } }, id: 54, userId: user.id, attempts: 3, wait: async () => assert.fail('must not wait') }),
  { code: 'CELLAR_DELETE_NOT_VERIFIED' })
  assert.equal(reads, 1)
})

test('cellar settlement is limited to six fresh reads and 4.75 seconds of waits', async () => {
  let reads = 0
  const waits = []
  await assert.rejects(verifyPersistedCellar({ provider: { get: async () => {
    reads += 1
    return { ...existing, quantity: 2, gift: '0' }
  } }, id: 54, userId: user.id, expected: { quantity: 5, gift: 1 }, attempts: 6,
  wait: async (ms) => waits.push(ms) }), (error) => {
    assert.deepEqual(error.mismatchFields, ['gift', 'quantity'])
    assert.equal(error.readbackState, 'MISMATCH')
    assert.equal(error.readbackAttempts, 6)
    assert.ok(!JSON.stringify(error).includes(user.id))
    return error.code === 'CELLAR_PERSISTENCE_MISMATCH'
  })
  assert.equal(reads, 6)
  assert.deepEqual(waits, [250, 500, 1_000, 1_500, 1_500])
  assert.equal(waits.reduce((sum, ms) => sum + ms, 0), 4_750)
})

test('late stored update and removal can settle on the final bounded read', async () => {
  let reads = 0
  const saved = await verifyPersistedCellar({ provider: { get: async () => ({ ...existing,
    quantity: ++reads === 6 ? 5 : 2 }) }, id: 54, userId: user.id,
  expected: { quantity: 5 }, attempts: 6, wait: async () => {} })
  assert.equal(saved.quantity, 5)
  reads = 0
  await verifyCellarRemoved({ provider: { get: async () => ++reads === 6 ? null : existing },
    id: 54, userId: user.id, attempts: 6, wait: async () => {} })
  assert.equal(reads, 6)
})

test('invalid settlement limits and provider errors fail without extra reads or waits', async () => {
  for (const verify of [verifyPersistedCellar, verifyCellarRemoved]) {
    for (const attempts of [0, 7, 1.5]) {
      await assert.rejects(verify({ provider: { get: async () => assert.fail('must not read') },
        id: 54, userId: user.id, expected: {}, attempts, wait: async () => assert.fail('must not wait') }))
    }
    const failure = Object.assign(new Error('provider unavailable'), { code: 'PROVIDER_ERROR' })
    let reads = 0
    await assert.rejects(verify({ provider: { get: async () => { reads += 1; throw failure } },
      id: 54, userId: user.id, expected: {}, attempts: 6, wait: async () => assert.fail('must not wait') }),
    (error) => error === failure)
    assert.equal(reads, 1)
  }
})

for (const phase of ['authentication', 'mutation', 'readback', 'hydration']) {
  test(`one cellar write deadline includes slow ${phase} and never retries the mutation`, async (context) => {
    for (const [key, value] of Object.entries({
      NOCODEBACKEND_INSTANCE: 'test-instance',
      NOCODEBACKEND_AUTH_SECRET_KEY: 'test-auth-secret',
      NOCODEBACKEND_AUTH_BASE_URL: 'https://app.nocodebackend.com/api/user-auth'
    })) {
      const previous = process.env[key]
      process.env[key] = value
      context.after(() => {
        if (previous === undefined) delete process.env[key]
        else process.env[key] = previous
      })
    }
    context.mock.timers.enable({ apis: ['setTimeout'] })
    let startStall, stalledSignal, writes = 0, reads = 0
    const stalled = new Promise((resolve) => { startStall = resolve })
    const stall = (signal) => new Promise((_resolve, reject) => {
      stalledSignal = signal
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      startStall()
    })
    context.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({
      ok: true,
      json: async () => {
        if (phase === 'authentication') return stall(signal)
        context.mock.timers.tick(3_000)
        return { user }
      }
    }))
    dataProvider.get = async (collection, _id, { signal }) => {
      reads += 1
      if (collection === COLLECTIONS.products) {
        context.mock.timers.tick(1_000)
        return { ...product, producer_id: phase === 'hydration' ? 8 : null }
      }
      if (collection === COLLECTIONS.cellar) {
        if (phase === 'readback') return stall(signal)
        return existing
      }
      return stall(signal)
    }
    dataProvider.create = async (_collection, _body, { signal }) => {
      writes += 1
      if (phase === 'mutation') return stall(signal)
      context.mock.timers.tick(1_000)
      return { id: existing.id }
    }
    const reply = response()
    const pending = handler({ method: 'POST', headers: {}, query: { path: ['cellar'] },
      body: { product_id: 12, quantity: 2, date_received: '2026-10-15' } }, reply)
    await stalled
    const remaining = phase === 'authentication' ? 10_000 : phase === 'mutation' ? 6_000 : 5_000
    context.mock.timers.tick(remaining - 1)
    assert.equal(reply.statusCode, null)
    assert.equal(stalledSignal.aborted, false)
    context.mock.timers.tick(1)
    await pending
    assert.equal(stalledSignal.aborted, true)
    assert.equal(reply.statusCode, 502)
    assert.equal(reply.body.code, 'CELLAR_WRITE_UNVERIFIED')
    assert.match(reply.body.error, /Reload your cellar and check it before making another change/)
    assert.equal(writes, phase === 'authentication' ? 0 : 1)
    const readsAtDeadline = reads
    context.mock.timers.tick(20_000)
    assert.equal(reads, readsAtDeadline)
    assert.equal(writes, phase === 'authentication' ? 0 : 1)
  })
}

test('cellar readback deadline cancels settlement waiting before another read', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const controller = new AbortController()
  let reads = 0, firstRead
  const reading = new Promise((resolve) => { firstRead = resolve })
  const pending = verifyPersistedCellar({
    provider: { get: async () => { reads += 1; firstRead(); return existing } },
    id: 54, userId: user.id, expected: { quantity: 5 }, attempts: 6, signal: controller.signal
  })
  const rejected = assert.rejects(pending, { name: 'AbortError' })
  await reading
  controller.abort()
  await rejected
  context.mock.timers.tick(10_000)
  assert.equal(reads, 1)
})

test('expired cellar request cannot start a mutation or acknowledge a late readback', async () => {
  const controller = new AbortController()
  controller.abort()
  dataProvider.create = async () => assert.fail('must not write')
  dataProvider.get = async () => assert.fail('must not read')
  await assert.rejects(__testables.createCellar({ body: {} }, response(), user,
    { signal: controller.signal }), { name: 'AbortError' })
  const late = new AbortController()
  await assert.rejects(verifyPersistedCellar({
    provider: { get: async () => { late.abort(); return existing } },
    id: 54, userId: user.id, expected: {}, signal: late.signal
  }), { name: 'AbortError' })
})

