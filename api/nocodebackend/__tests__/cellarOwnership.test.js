import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables, routeCellarRequest } from '../../cellar-data-proxy.js'

const originalProviderMethods = { ...dataProvider }

afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
})

const createResponse = () => ({
  body: null,
  statusCode: null,
  status(statusCode) {
    this.statusCode = statusCode
    return this
  },
  json(body) {
    this.body = body
    return this
  }
})

test('owner-scoped cellar updates cannot orphan owned or other-user records', async () => {
  const records = new Map([
    ['10', { id: 10, user_id: 'user-a', product_id: 100, notes: 'Owned' }],
    ['20', { id: 20, user_id: 'user-b', product_id: 200, notes: 'Private' }]
  ])
  const updateCalls = []

  dataProvider.get = async (collection, id) => {
    if (collection === COLLECTIONS.cellar) return records.get(String(id)) || null
    if (collection === COLLECTIONS.products) return id === '300' ? { id: 300, product_name: 'Replacement' } : null
    return null
  }
  dataProvider.list = async () => []
  dataProvider.update = async (collection, id, updates) => {
    updateCalls.push({ collection, id, updates })
    const updated = { ...records.get(String(id)), ...updates }
    records.set(String(id), updated)
    return updated
  }

  for (const product_id of [null, '', 0, 'bad', 999]) {
    const response = createResponse()
    if (product_id === 999) {
      await __testables.updateCellar(10, { body: { product_id } }, response, { id: 'user-a' })
      assert.equal(response.statusCode, 404)
    } else {
      await assert.rejects(
        __testables.updateCellar(10, { body: { product_id } }, response, { id: 'user-a' }),
        /Product identifier is invalid/
      )
    }
  }

  await assert.rejects(
    __testables.updateCellar(20, { body: { product_id: 300 } }, createResponse(), { id: 'user-a' }),
    (error) => error.status === 403
  )
  assert.equal(updateCalls.length, 0)
  assert.equal(records.get('10').product_id, 100)
  assert.equal(records.get('20').product_id, 200)

  const omittedResponse = createResponse()
  await __testables.updateCellar(10, { body: { notes: 'Updated' } }, omittedResponse, { id: 'user-a' })
  assert.deepEqual(updateCalls.at(-1).updates, { notes: 'Updated' })
  assert.equal(records.get('10').product_id, 100)

  const replacementResponse = createResponse()
  await __testables.updateCellar(10, { body: { product_id: 300 } }, replacementResponse, { id: 'user-a' })
  assert.equal(records.get('10').product_id, '300')
  assert.equal(replacementResponse.statusCode, 200)
})

test('invalid cellar create and update payloads fail with 400 before any provider mutation', async () => {
  const mutations = []
  dataProvider.get = async (collection) => {
    if (collection === COLLECTIONS.cellar) return { id: 10, user_id: 'user-a', product_id: 100 }
    if (collection === COLLECTIONS.products) return { id: 100, product_name: 'Fixture beer' }
    return null
  }
  dataProvider.create = async (collection, input) => {
    mutations.push({ collection, input })
    return { id: 30, ...input }
  }
  dataProvider.update = async (collection, id, input) => {
    mutations.push({ collection, id, input })
    return { id, user_id: 'user-a', product_id: 100, ...input }
  }
  const invalid = [
    { date_received: '2026-02-30' }, { date_received: 0 }, { quantity: true },
    { mls: [] }, { purchase_price: false }, { retail_price: ['12'] },
    { gift: 'false' }, { notes: {} }, { product_id: [100] }
  ]
  for (const input of invalid) {
    for (const method of ['POST', 'PUT']) {
      await assert.rejects(routeCellarRequest({
        method,
        query: { path: method === 'POST' ? 'cellar' : 'cellar/10' },
        body: { product_id: 100, ...input }
      }, createResponse(), { id: 'user-a' }), (error) => error.status === 400)
    }
  }
  assert.deepEqual(mutations, [])
})

test('cellar create and partial update persist valid form values with server-owned identity', async () => {
  let stored
  dataProvider.get = async (collection) => {
    if (collection === COLLECTIONS.cellar) return stored
    if (collection === COLLECTIONS.products) return { id: 100, product_name: 'Fixture beer' }
    return null
  }
  dataProvider.create = async (collection, input) => {
    assert.equal(collection, COLLECTIONS.cellar)
    stored = { id: 30, ...input }
    return stored
  }
  dataProvider.update = async (collection, id, input) => {
    assert.equal(collection, COLLECTIONS.cellar)
    assert.equal(id, 30)
    stored = { ...stored, ...input }
    return stored
  }
  const created = createResponse()
  await routeCellarRequest({
    method: 'POST', query: { path: 'cellar' },
    body: {
      product_id: 100, user_id: 'forged-owner', quantity: '0', mls: '375',
      purchase_price: '12.50', retail_price: 0, date_received: '2024-02-29',
      gift: '0', notes: '  Owned  ', sharing_series_id: null, series_version_id: ''
    }
  }, created, { id: 'user-a' })
  assert.equal(created.statusCode, 201)
  assert.equal(stored.user_id, 'user-a')
  assert.equal(stored.quantity, 0)
  assert.equal(stored.mls, 375)
  assert.equal(stored.purchase_price, 12.5)
  assert.equal(stored.retail_price, 0)
  assert.equal(stored.date_received, '2024-02-29')
  assert.equal(stored.gift, 0)
  assert.equal(stored.sharing_series_id, null)
  assert.equal(stored.series_version_id, null)
  assert.equal(created.body.item.gift, false)

  const updated = createResponse()
  await routeCellarRequest({
    method: 'PUT', query: { path: 'cellar/30' },
    body: { quantity: '2', date_received: '', gift: false, notes: '  Updated  ', user_id: 'forged-owner' }
  }, updated, { id: 'user-a' })
  assert.equal(updated.statusCode, 200)
  assert.equal(stored.user_id, 'user-a')
  assert.equal(stored.quantity, 2)
  assert.equal(stored.date_received, null)
  assert.equal(stored.notes, 'Updated')
  assert.equal(stored.product_id, '100')
})
