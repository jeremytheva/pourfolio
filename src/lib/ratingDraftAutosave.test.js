import test from 'node:test'
import assert from 'node:assert/strict'
import { createRatingDraftAutosave } from './ratingDraftAutosave.js'

const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 10))

test('a partial rating automatically saves without a manual flush or upload', async () => {
  const writes = []
  const states = []
  const autosave = createRatingDraftAutosave({ delay: 0, onState: (state) => states.push(state.status), save: async (draft, revision) => {
    writes.push({ draft, revision })
    return { ...draft, revision: 'r1' }
  } })
  const snapshot = { submissionId: 123, scores: { 2: 4 }, step: 2 }
  autosave.update(snapshot)
  snapshot.scores[2] = 7
  await nextTurn()
  assert.deepEqual(writes, [{ draft: { submissionId: 123, scores: { 2: 4 }, step: 2 }, revision: null }])
  assert.equal(states.at(-1), 'saved')
  await autosave.close()
})

test('rapid edits coalesce and wait for the prior revision before writing', async () => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const writes = []
  const states = []
  const autosave = createRatingDraftAutosave({ revision: 'original', onState: (state) => states.push(state.status), save: async (draft, revision) => {
    writes.push({ draft, revision })
    if (writes.length === 1) await gate
    return { ...draft, revision: `r${writes.length}` }
  } })
  autosave.update({ score: 1 })
  const completion = autosave.flush()
  autosave.update({ score: 2 })
  autosave.update({ score: 3 })
  assert.equal(writes.length, 1)
  release()
  assert.equal((await completion).score, 3)
  assert.deepEqual(writes, [{ draft: { score: 1 }, revision: 'original' }, { draft: { score: 3 }, revision: 'r1' }])
  assert.equal(states.filter((status) => status === 'saved').length, 1)
  await autosave.close()
})

test('a tab conflict pauses automatic and explicit writes until the editor is reloaded', async () => {
  let calls = 0
  const error = Object.assign(new Error('Another tab saved a newer draft.'), { code: 'OFFLINE_DRAFT_CONFLICT' })
  const autosave = createRatingDraftAutosave({ save: async () => { calls += 1; throw error } })
  await assert.rejects(autosave.flush({ score: 1 }), { code: error.code })
  autosave.update({ score: 7 })
  await assert.rejects(autosave.flush(), { code: error.code })
  assert.equal(calls, 1)
  await assert.rejects(autosave.close(), { code: error.code })
})

test('storage failure never reports saved and an explicit retry retains the newest edit', async () => {
  let unavailable = true
  const states = []
  const autosave = createRatingDraftAutosave({ onState: (state) => states.push(state.status), save: async (draft) => {
    if (unavailable) throw new Error('Storage unavailable')
    return { ...draft, revision: 'r1' }
  } })
  await assert.rejects(autosave.flush({ score: 1 }), /Storage/)
  assert.equal(states.includes('saved'), false)
  unavailable = false
  assert.equal((await autosave.flush({ score: 7 })).score, 7)
  await autosave.close()
})

test('leaving an editor flushes its last captured value and rejects late replacement edits', async () => {
  const writes = []
  const autosave = createRatingDraftAutosave({ save: async (draft) => {
    writes.push(draft)
    return { ...draft, revision: 'r1' }
  } })
  autosave.update({ productId: 4, score: 3 })
  const complete = autosave.close()
  autosave.update({ productId: 5, score: 7 })
  await complete
  await autosave.close()
  assert.deepEqual(writes, [{ productId: 4, score: 3 }])
})
