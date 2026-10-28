import assert from 'node:assert/strict'
import test from 'node:test'
import { collectPagedRecords, listAllBrewDoneItRecords } from '../brewDoneItData.js'
import { dataProvider } from '../dataProvider.js'
import { listParticipantSeriesV3 } from '../brewDoneItViewV3.js'

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

const filteredPage = (items, totalPages = 1) => ({ items, totalPages })
const providerFailure = { status: 502, code: 'PROVIDER_ERROR' }

test('filtered Brew reads preserve exact scalar matching and numeric/string ID compatibility', async (context) => {
  const calls = []
  context.mock.method(dataProvider, 'listPage', async (collection, request) => {
    calls.push(request)
    return filteredPage([{ id: request.page, game_id: request.page === 1 ? '61' : 61 }], 2)
  })
  const result = await listAllBrewDoneItRecords('brew_done_it_rounds', { game_id: 61 }, { pageSize: 1 })
  assert.deepEqual(result.map(row => row.id), [1, 2])
  assert.deepEqual(calls.map(call => call.filters), [{ game_id: 61 }, { game_id: 61 }])
})

test('filtered Brew reads reject every foreign participant, parent and owner/state boundary', async (context) => {
  const cases = [
    ['brew_done_it_games', { creator_participant_id: 'owner-a' }, { creator_participant_id: 'owner-b' }],
    ['brew_done_it_games', { opponent_participant_id: 'owner-a' }, { opponent_participant_id: 'owner-b' }],
    ['brew_done_it_rounds', { game_id: 61 }, { game_id: 99 }],
    ['brew_done_it_guesses', { round_id: 62 }, { round_id: 99 }],
    ['brew_done_it_deductions', { round_id: 62 }, { round_id: 99 }],
    ['ratings', { user_id: 'owner-a', submission_state: 'complete' }, { user_id: 'owner-b', submission_state: 'complete' }],
    ['ratings', { user_id: 'owner-a', submission_state: 'complete' }, { user_id: 'owner-a', submission_state: 'pending' }]
  ]
  for (const [collection, filters, row] of cases) {
    const mock = context.mock.method(dataProvider, 'listPage', async () => filteredPage([{ id: 1, ...row }]))
    await assert.rejects(listAllBrewDoneItRecords(collection, filters), providerFailure)
    mock.mock.restore()
  }
})

test('a later mis-scoped page cannot return a partially collected authorised result', async (context) => {
  const calls = []
  context.mock.method(dataProvider, 'listPage', async (collection, { page }) => {
    calls.push(page)
    return filteredPage([{ id: page, round_id: page === 1 ? 62 : 99 }], 2)
  })
  await assert.rejects(listAllBrewDoneItRecords('brew_done_it_guesses', { round_id: 62 }, { pageSize: 1 }), providerFailure)
  assert.deepEqual(calls, [1, 2])
})

test('filtered rows require own scalar fields rather than inherited, missing or coerced values', async (context) => {
  for (const row of [null, [], {}, Object.create({ round_id: 62 }), { round_id: [62] }, { round_id: { toString: () => '62' } }, { round_id: null }]) {
    const mock = context.mock.method(dataProvider, 'listPage', async () => filteredPage([row]))
    await assert.rejects(listAllBrewDoneItRecords('brew_done_it_guesses', { round_id: 62 }), providerFailure)
    mock.mock.restore()
  }
})

test('unsupported filters fail before the provider can turn them into an unfiltered read', async (context) => {
  const mock = context.mock.method(dataProvider, 'listPage', async () => filteredPage([]))
  for (const filters of [null, [], { round_id: undefined }, { round_id: null }, { round_id: '' }, { round_id: ' ' },
    { round_id: [62] }, { round_id: {} }, { round_id: false }, { round_id: NaN }, { 'round_id[like]': '62' }]) {
    await assert.rejects(listAllBrewDoneItRecords('brew_done_it_guesses', filters), providerFailure)
  }
  assert.equal(mock.mock.callCount(), 0)
})

test('ignored participant filters cannot disclose an unrelated completed series or secret', async (context) => {
  const rows = {
    brew_done_it_games: [{ id: 61, creator_participant_id: 'owner-a', opponent_participant_id: 'owner-b', status: 'active' }],
    brew_done_it_rounds: [{ id: 62, game_id: 61, round_number: 1, selector_participant_id: 'owner-a', guesser_participant_id: 'owner-b', status: 'completed', selected_product_id: 9 }],
    brew_done_it_deductions: []
  }
  context.mock.method(dataProvider, 'listPage', async collection => filteredPage(rows[collection] || []))
  for (const method of ['get', 'create', 'update', 'compareAndSet', 'remove']) {
    context.mock.method(dataProvider, method, () => assert.fail('A foreign series must never reach recovery or another provider operation'))
  }
  let responses = 0
  const response = { status() { return this }, json() { responses += 1 } }
  await assert.rejects(listParticipantSeriesV3(response, { id: 'unrelated-viewer' }), providerFailure)
  assert.equal(responses, 0)
})

test('a foreign child round cannot enter projection or pending-action recovery', async (context) => {
  const game = { id: 61, creator_participant_id: 'owner-a', opponent_participant_id: 'owner-b', status: 'active' }
  const round = { id: 62, game_id: 99, pending_action_key: 'private-pending-key', pending_action_type: 'outcome:beer' }
  context.mock.method(dataProvider, 'listPage', async (collection, { filters }) => {
    if (collection === 'brew_done_it_games') return filteredPage(filters.creator_participant_id ? [game] : [])
    return filteredPage([round])
  })
  for (const method of ['get', 'create', 'update', 'compareAndSet', 'remove']) {
    context.mock.method(dataProvider, method, () => assert.fail('Foreign round must be rejected before recovery'))
  }
  let responses = 0
  await assert.rejects(listParticipantSeriesV3({ status() { return this }, json() { responses += 1 } }, { id: 'owner-a' }), providerFailure)
  assert.equal(responses, 0)
})

test('public catalogue enumeration remains unfiltered and private filtered reads may be empty', async (context) => {
  context.mock.method(dataProvider, 'listPage', async collection => filteredPage(collection === 'products' ? [{ id: 1, product_name: 'Fixture' }] : []))
  assert.deepEqual(await listAllBrewDoneItRecords('products'), [{ id: 1, product_name: 'Fixture' }])
  assert.deepEqual(await listAllBrewDoneItRecords('brew_done_it_guesses', { round_id: 62 }), [])
})
