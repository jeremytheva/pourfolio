import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ratingService } from '../ratingService.js'

test('private history sends pagination and an optional canonical rating selector on the same-origin API', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ items: [], page: 2 }), { status: 200 }))
  const previousWindow = globalThis.window
  globalThis.window = { setTimeout, clearTimeout }
  try {
    await ratingService.getHistory()
    await ratingService.getHistory({ page: 2, ratingId: 99 })
    await ratingService.getHistory({ ratingId: '99&user_id=owner-b' })
    assert.deepEqual(globalThis.fetch.mock.calls.map(({ arguments: [url] }) => url), [
      '/api/nocodebackend/ratings/history?page=1&limit=20',
      '/api/nocodebackend/ratings/history?page=2&limit=20&rating_id=99',
      '/api/nocodebackend/ratings/history?page=1&limit=20&rating_id=99%26user_id%3Downer-b'
    ])
    assert.ok(globalThis.fetch.mock.calls.every(({ arguments: [, options] }) => options.credentials === 'include'))
  } finally {
    globalThis.window = previousWindow
  }
})
