import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ratingDraftKey, projectRatingForm, cacheRatingForm, loadCachedRatingForm,
  saveRatingDraft, loadRatingDraft, discardRatingDraft
} from './offlineRatingStore.js'

const memoryIndexedDB = () => {
  const stores = new Map()
  const db = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore: (name) => stores.set(name, new Map()),
    close() {},
    transaction(name) {
      const tx = { oncomplete: null, onerror: null, onabort: null, aborted: false, abort() { this.aborted = true; queueMicrotask(() => this.onabort?.()) } }
      let pending = 0
      const wrap = (operation) => {
        pending += 1
        const req = { result: undefined, onsuccess: null }
        queueMicrotask(() => {
          req.result = operation()
          req.onsuccess?.()
          pending -= 1
          if (pending === 0 && !tx.aborted) queueMicrotask(() => tx.oncomplete?.())
        })
        return req
      }
      tx.objectStore = () => ({
        get: (key) => wrap(() => stores.get(name).get(key)),
        put: (value, key) => wrap(() => { stores.get(name).set(key, structuredClone(value)); return key }),
        delete: (key) => wrap(() => stores.get(name).delete(key))
      })
      return tx
    }
  }
  return {
    open: () => {
      const req = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null }
      queueMicrotask(() => {
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    }
  }
}

test('identity keys are unambiguous and invalid owners/products fail closed', () => {
  assert.notEqual(ratingDraftKey('user-1', '23'), ratingDraftKey('user-12', '3'))
  assert.throws(() => ratingDraftKey('', '23'))
  assert.throws(() => ratingDraftKey('user-1', 'NaN'))
  assert.throws(() => ratingDraftKey('user-1', '0'))
})

test('cache projects only rating-form fields and requires a matching product', () => {
  const form = {
    product: { id: 23, product_name: 'Beer' },
    attributes: [{ id: 1, attribute_name: 'Aroma' }],
    bonusAttributes: [],
    bonusCategories: [],
    session: 'do not store',
    token: 'do not store'
  }
  const projection = projectRatingForm(form, '23')
  assert.equal(projection.product.id, 23)
  assert.equal(Object.hasOwn(projection, 'session'), false)
  assert.equal(Object.hasOwn(projection, 'token'), false)
  assert.throws(() => projectRatingForm(form, '24'))
})

test('drafts and forms survive requests, are account-scoped and never sync themselves', async () => {
  const previous = globalThis.indexedDB
  globalThis.indexedDB = memoryIndexedDB()
  try {
    const form = { product: { id: 23 }, attributes: [{ id: 1 }] }
    await cacheRatingForm('alice', 23, form)
    assert.deepEqual(await loadCachedRatingForm('alice', 23), { ...form, bonusAttributes: [], bonusCategories: [] })
    assert.equal(await loadCachedRatingForm('bob', 23), null)
    const saved = await saveRatingDraft('alice', 23, {
      submissionId: 1700000000000001, scores: { 1: 5 },
      bonusIds: [2], weights: { aroma: 0.1 }, cellarId: ''
    })
    assert.equal(saved.submissionId, 1700000000000001)
    assert.deepEqual((await loadRatingDraft('alice', 23)).scores, { 1: 5 })
    assert.equal(await loadRatingDraft('bob', 23), null)
    assert.equal(await discardRatingDraft('alice', 23, 1700000000000002), false)
    assert.equal((await loadRatingDraft('alice', 23)).submissionId, 1700000000000001)
    assert.equal(await discardRatingDraft('alice', 23, 1700000000000001, saved.revision), true)
    assert.equal(await loadRatingDraft('alice', 23), null)
  } finally {
    globalThis.indexedDB = previous
  }
})

test('offline storage unavailability reports error rather than fabricated save', async () => {
  const previous = globalThis.indexedDB
  delete globalThis.indexedDB
  try {
    await assert.rejects(saveRatingDraft('alice', 23, { submissionId: 1700000000000003 }), /unavailable/)
    await assert.rejects(loadRatingDraft('alice', 23), /unavailable/)
  } finally {
    if (previous !== undefined) globalThis.indexedDB = previous
  }
})

test('draft creation refuses missing submission identity', async () => {
  await assert.rejects(saveRatingDraft('alice', 23, { scores: {} }), /submission identifier/)
  await assert.rejects(saveRatingDraft('alice', 23, { submissionId: '1700000000000001' }), /submission identifier/)
  await assert.rejects(saveRatingDraft('alice', 23, { submissionId: Number.MAX_SAFE_INTEGER + 1 }), /submission identifier/)
  for (const step of [-1, 1.5, 129, NaN, '2']) {
    await assert.rejects(saveRatingDraft('alice', 23, { submissionId: 1700000000000001, step }), /step/)
  }
})


test('stale saves and acknowledgements preserve newer revisions, including after deletion', async () => {
  const previous = globalThis.indexedDB
  globalThis.indexedDB = memoryIndexedDB()
  try {
    const draft = { submissionId: 1700000000000001, scores: { 1: 4 }, step: 2, form: { product: { id: 23 }, attributes: [], bonusAttributes: [{ id: 9, point_value: 0.7 }] } }
    const original = await saveRatingDraft('alice', 23, draft)
    const newer = await saveRatingDraft('alice', 23, { ...draft, scores: { 1: 7 } }, original.revision)
    await assert.rejects(saveRatingDraft('alice', 23, draft, original.revision), { code: 'OFFLINE_DRAFT_CONFLICT' })
    assert.equal(await discardRatingDraft('alice', 23, draft.submissionId, original.revision), false)
    assert.equal((await loadRatingDraft('alice', 23)).scores[1], 7)
    assert.equal((await loadRatingDraft('alice', 23)).step, 2)
    assert.equal((await loadRatingDraft('alice', 23)).form.bonusAttributes[0].point_value, 0.7)
    assert.equal(await discardRatingDraft('alice', 23, draft.submissionId, newer.revision), true)
    await assert.rejects(saveRatingDraft('alice', 23, draft, newer.revision), { code: 'OFFLINE_DRAFT_CONFLICT' })
    assert.equal(await loadRatingDraft('alice', 23), null)
  } finally { globalThis.indexedDB = previous }
})
