import assert from 'node:assert/strict'
import test from 'node:test'
import { findProfileHistoryFixture } from '../../release-check/profileHistoryFixture.js'

const verifiedRating = (id) => ({
  id, product_id: 4, product: { id: 4, product_name: 'Synthetic fixture beer' }, total_weighted: 4
})
const unenrichedRatings = (count, firstId = 100) => Array.from({ length: count }, (_, index) => ({
  id: firstId + index, product_id: 4, product: null, total_weighted: 4
}))
const historyPage = (page, items, total = 21) => ({
  page, pageSize: 20, items, total, totalPages: Math.ceil(total / 20), summary: { count: total }
})
const reader = (pages) => {
  const reads = []
  return {
    reads,
    readPage: async (page) => {
      reads.push(page)
      assert.ok(Object.hasOwn(pages, page), 'Discovery must not read an unprovided page.')
      return pages[page]
    }
  }
}

test('eligible first-page tasting remains the fallback when page two has no verified beer', async () => {
  const rating = verifiedRating(1)
  const first = historyPage(1, [rating, ...unenrichedRatings(19)])
  const older = historyPage(2, unenrichedRatings(1, 200))
  const before = structuredClone([first, older])
  const { readPage, reads } = reader({ 1: first, 2: older })
  const fixture = await findProfileHistoryFixture(readPage)
  assert.equal(fixture.rating, rating)
  assert.equal(fixture.source, first)
  assert.deepEqual(reads, [1, 2])
  assert.deepEqual([first, older], before)
})

test('eligible older-page tasting retains preference and its exact page metadata', async () => {
  const first = historyPage(1, [verifiedRating(1), ...unenrichedRatings(19)])
  const rating = verifiedRating(2)
  const older = historyPage(2, [rating])
  const { readPage, reads } = reader({ 1: first, 2: older })
  const fixture = await findProfileHistoryFixture(readPage)
  assert.equal(fixture.rating, rating)
  assert.equal(fixture.source, older)
  assert.deepEqual(reads, [1, 2])
})

test('discovery can find an eligible tasting only present on page two', async () => {
  const first = historyPage(1, unenrichedRatings(20))
  const rating = verifiedRating(2)
  const older = historyPage(2, [rating])
  const { readPage, reads } = reader({ 1: first, 2: older })
  assert.deepEqual(await findProfileHistoryFixture(readPage), { rating, source: older })
  assert.deepEqual(reads, [1, 2])
})

test('one-page history does not request an older page', async () => {
  const rating = verifiedRating(1)
  const first = historyPage(1, [rating], 1)
  const { readPage, reads } = reader({ 1: first })
  assert.deepEqual(await findProfileHistoryFixture(readPage), { rating, source: first })
  assert.deepEqual(reads, [1])
})

test('empty owner history has no fixture and requires only its first page', async () => {
  const { readPage, reads } = reader({ 1: historyPage(1, [], 0) })
  assert.equal(await findProfileHistoryFixture(readPage), null)
  assert.deepEqual(reads, [1])
})

test('absence within the discovery bound never requests page three', async () => {
  const { readPage, reads } = reader({
    1: historyPage(1, unenrichedRatings(20), 61),
    2: historyPage(2, unenrichedRatings(20, 200), 61)
  })
  assert.equal(await findProfileHistoryFixture(readPage), null)
  assert.deepEqual(reads, [1, 2])
})

test('fixture eligibility still requires a canonical rating ID and verified matching beer', async () => {
  const first = historyPage(1, [
    { ...verifiedRating(0) },
    { ...verifiedRating(1), product_id: 5 },
    { ...verifiedRating(2), product: { id: 4 } }
  ], 3)
  const { readPage } = reader({ 1: first })
  assert.equal(await findProfileHistoryFixture(readPage), null)
})

test('failed older reads propagate rather than using a first-page fixture or skipping', async () => {
  const failure = new Error('Synthetic history read failed.')
  const first = historyPage(1, [verifiedRating(1), ...unenrichedRatings(19)])
  const reads = []
  await assert.rejects(findProfileHistoryFixture(async (page) => {
    reads.push(page)
    if (page === 2) throw failure
    return first
  }), (error) => error === failure)
  assert.deepEqual(reads, [1, 2])
})

test('each response uses its own counts without assuming the reads are atomic', async () => {
  const rating = verifiedRating(1)
  const first = historyPage(1, [rating, ...unenrichedRatings(19)])
  const { readPage, reads } = reader({ 1: first, 2: historyPage(2, [], 0) })
  assert.deepEqual(await findProfileHistoryFixture(readPage), { rating, source: first })
  assert.deepEqual(reads, [1, 2])
})

test('malformed page responses fail before they can become fixture absence', async () => {
  const invalid = [
    (page) => ({ ...page, page: page.page + 1 }),
    (page) => ({ ...page, pageSize: 10 }),
    (page) => ({ ...page, items: null }),
    (page) => ({ ...page, items: [] }),
    (page) => ({ ...page, items: page.items.slice(1) }),
    (page) => ({ ...page, items: unenrichedRatings(21) }),
    (page) => ({ ...page, items: [null] }),
    (page) => ({ ...page, total: -1 }),
    (page) => ({ ...page, totalPages: 99 }),
    (page) => ({ ...page, summary: { count: page.total + 1 } })
  ]
  for (const requestedPage of [1, 2]) {
    for (const corrupt of invalid) {
      const first = historyPage(1, [verifiedRating(1), ...unenrichedRatings(19)])
      const older = historyPage(2, [verifiedRating(2)])
      const { readPage, reads } = reader({
        1: requestedPage === 1 ? corrupt(first) : first,
        2: requestedPage === 2 ? corrupt(older) : older
      })
      await assert.rejects(findProfileHistoryFixture(readPage), {
        message: 'The owner history fixture response is invalid.'
      })
      assert.deepEqual(reads, requestedPage === 1 ? [1] : [1, 2])
    }
  }
})
