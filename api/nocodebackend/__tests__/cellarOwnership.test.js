import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { COLLECTIONS } from '../../../src/data/contract.js'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../[...path].js'

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
