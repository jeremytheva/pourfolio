import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { dataProvider } from '../dataProvider.js'
import { projectCellarRecord, verifyPersistedCellar, verifyCellarRemoved, __testables } from '../../cellar-data-proxy.js'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../../src/data/contract.js'

const original = { ...dataProvider }
afterEach(() => Object.assign(dataProvider, original))
const user = { id: 'owner-a' }
const product = { id: 12, product_name: 'Fixture beer', producer_id: null, product_category_id: null }
const existing = { id: 54, user_id: 'owner-a', product_id: 12, quantity: 2, date_received: '2026-10-15', gift: '0' }
const response = () => ({
  statusCode: null, body: null,
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
