import assert from 'node:assert/strict'
import test from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { routeCatalogueRequest } from '../../catalog-data-proxy.js'

const original = { ...dataProvider }
test.afterEach(() => Object.assign(dataProvider, original))
const response = () => ({ status(code) { this.code = code; return this }, json(body) { this.body = body; return this } })
const request = (path, method = 'GET') => ({ query: { path: ['catalog', 'style-references', ...path] }, method })

test('style reference endpoint reads the exact category and never performs writes or catalogue-wide scans', async () => {
  const calls = []
  dataProvider.get = async (collection, id) => { calls.push([collection, id]); return { id: 31, category_name: 'American IPA', secret_key: 'never-return' } }
  for (const operation of ['create', 'update', 'remove', 'list', 'listPage']) dataProvider[operation] = async () => assert.fail('unexpected provider operation')
  const reply = response()
  await routeCatalogueRequest(request(['31']), reply, { id: 'owner' })
  assert.equal(reply.code, 200)
  assert.equal(reply.body.status, 'mapped')
  assert.deepEqual(calls, [['categories', '31']])
  assert.equal(JSON.stringify(reply.body).includes('never-return'), false)
})

test('unknown, changed, missing and malformed category identities fail conservatively', async () => {
  for (const [row, code, status] of [[null, 404], [{ id: 30, category_name: 'American IPA' }, 404], [{ id: 31, category_name: 'IPA' }, 200, 'unmapped']]) {
    dataProvider.get = async () => row
    const reply = response()
    await routeCatalogueRequest(request(['31']), reply, { id: 'owner' })
    assert.equal(reply.code, code)
    if (status) assert.equal(reply.body.status, status)
  }
  await assert.rejects(routeCatalogueRequest(request(['0']), response(), {}), (e) => e.status === 400)
})

test('style reference routes reject unsupported methods and trailing segments', async () => {
  dataProvider.get = async () => assert.fail('unsupported route must not read provider')
  for (const req of [request(['31'], 'POST'), request(['31', 'extra'])]) {
    const reply = response()
    await routeCatalogueRequest(req, reply, {})
    assert.equal(reply.code, 404)
  }
})
