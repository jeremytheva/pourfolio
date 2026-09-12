import assert from 'node:assert/strict'
import test from 'node:test'
import { collectPagedRecords } from '../brewDoneItData.js'

test('paged Brew reads collect every provider page', async () => {
  const calls = []
  const rows = await collectPagedRecords(async (page, limit) => {
    calls.push([page, limit])
    if (page === 1) return { items: [{ id: 1 }, { id: 2 }], totalPages: 2 }
    return { items: [{ id: 3 }], totalPages: 2 }
  }, { pageSize: 2, maxPages: 5 })

  assert.deepEqual(rows.map((row) => row.id), [1, 2, 3])
  assert.deepEqual(calls, [[1, 2], [2, 2]])
})

test('empty provider collection stops after the first page', async () => {
  let calls = 0
  const rows = await collectPagedRecords(async () => {
    calls += 1
    return { items: [], totalPages: 0 }
  })
  assert.deepEqual(rows, [])
  assert.equal(calls, 1)
})

test('paged Brew reads fail closed when provider page metadata is invalid', async () => {
  await assert.rejects(
    collectPagedRecords(async () => ({ items: [], totalPages: 'unknown' })),
    /complete provider data set/i
  )
})

test('paged Brew reads fail closed instead of silently truncating at the safety bound', async () => {
  await assert.rejects(
    collectPagedRecords(async () => ({ items: [{ id: 1 }], totalPages: 3 }), { pageSize: 1, maxPages: 2 }),
    /complete provider data set/i
  )
})
