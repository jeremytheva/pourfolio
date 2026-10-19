import assert from 'node:assert/strict'
import test from 'node:test'
import { newRatingCleanupId, withRatingCleanup } from '../ratingCleanup.js'

const payload = { rating: { id: 99, product_id: 4 }, duplicate: false }
const scope = { productId: 4, beforeIds: new Set(['1', '2']) }

test('cleanup selects only the new acknowledged canonical tasting for the expected product', () => {
  assert.equal(newRatingCleanupId(payload, scope), '99')
  for (const candidate of [
    { ...payload, duplicate: true },
    { ...payload, duplicate: undefined },
    { ...payload, rating: { id: 1, product_id: 4 } },
    { ...payload, rating: { id: 99, product_id: 5 } },
    { ...payload, rating: { id: '99/other', product_id: 4 } },
    { ...payload, rating: { id: '099', product_id: 4 } },
    { ...payload, rating: { id: Number.MAX_SAFE_INTEGER + 1, product_id: 4 } },
    { ...payload, rating: {} },
    null
  ]) assert.equal(newRatingCleanupId(candidate, scope), null)
  assert.equal(newRatingCleanupId(payload, { ...scope, beforeIds: new Set([99]) }), null)
})

const fixture = (overrides = {}) => {
  const calls = []
  return {
    calls,
    options: {
      ...scope,
      submit: async () => ({ status: 201, body: payload }),
      verify: async () => { calls.push('verify') },
      remove: async (id) => { calls.push(`delete:${id}`); return 204 },
      readHistory: async () => { calls.push('history'); return { items: [{ id: 1 }, { id: 2 }] } },
      ...overrides
    }
  }
}

test('the connected check requires exact 204, stable repeated deletion and a fresh absent owner read', async () => {
  const { calls, options } = fixture()
  await withRatingCleanup(options)
  assert.deepEqual(calls, ['verify', 'delete:99', 'delete:99', 'history'])
})

test('a post-submit history or navigation failure still cleans the acknowledged tasting', async () => {
  const { calls, options } = fixture({ verify: async () => { throw new Error('History unavailable after save') } })
  await assert.rejects(withRatingCleanup(options), /History unavailable after save/)
  assert.deepEqual(calls, ['delete:99', 'delete:99', 'history'])
})

test('unknown, replayed or pre-existing identities never become guessed deletion targets', async () => {
  for (const body of [null, { ...payload, duplicate: true }, { ...payload, rating: { id: 1, product_id: 4 } }]) {
    const { calls, options } = fixture({ submit: async () => ({ status: 201, body }) })
    await assert.rejects(withRatingCleanup(options), /cleanup is unconfirmed/)
    assert.deepEqual(calls, [])
  }
})

test('a failed or lost submit response is not retried and cannot authorize a guessed delete', async () => {
  const { calls, options } = fixture({ submit: async () => { throw new Error('Submit outcome unknown') } })
  await assert.rejects(withRatingCleanup(options), /Submit outcome unknown/)
  assert.deepEqual(calls, [])
})

test('HTTP 200 delete acknowledgement cannot pass terminal deletion acceptance', async () => {
  const { options } = fixture({ remove: async () => 200 })
  await assert.rejects(withRatingCleanup(options), /HTTP 204/)
})

test('a rating remaining in owner history fails cleanup acceptance', async () => {
  const { options } = fixture({ readHistory: async () => ({ items: [{ id: 99 }] }) })
  await assert.rejects(withRatingCleanup(options), /remains in owner history/)
})

test('both the original assertion and cleanup failure remain visible', async () => {
  const { options } = fixture({
    verify: async () => { throw new Error('Original verification failed') },
    remove: async () => 503
  })
  await assert.rejects(withRatingCleanup(options), (error) => {
    assert.equal(error instanceof AggregateError, true)
    assert.match(error.errors[0].message, /Original verification failed/)
    assert.match(error.errors[1].message, /HTTP 204/)
    return true
  })
})
