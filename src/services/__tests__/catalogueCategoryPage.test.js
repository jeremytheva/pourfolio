import assert from 'node:assert/strict'
import test from 'node:test'
import { validateCatalogueCategoryPage } from '../catalogueResponse.js'
import { styleService } from '../styleService.js'

const category = (id) => ({ id, category_name: `Category ${String(id).padStart(3, '0')}`, parent_id: null })
const pageOf = (items, page, total, pageSize = 100) => ({
  items, page, pageSize, total, totalPages: Math.ceil(total / pageSize), pagination: 'exact', hasMore: page < Math.ceil(total / pageSize)
})
const continuation = (items, page, hasMore) => ({ items, page, pageSize: 100, total: null, totalPages: null, pagination: 'continuation', hasMore })

test('canonical category pages are strict and strip no malformed or private content silently', () => {
  const valid = pageOf([category(1), category(2)], 1, 2)
  assert.deepEqual(validateCatalogueCategoryPage(valid, { expectedPage: 1, expectedPageSize: 100 }).items, valid.items)
  for (const broken of [
    { ...valid, items: [{ ...category(1), user_id: 'private' }, category(2)] },
    { ...valid, items: [category(1), category(1)] },
    { ...valid, items: [category(1), null] },
    { ...valid, items: [category(1)] },
    { ...valid, totalPages: 2 },
    { ...valid, pageSize: 0 },
    { ...valid, hasMore: true }, { ...valid, pagination: 'estimated' }, { ...valid, pagination: undefined },
    { ...valid, items: [category(1), { ...category(2), category_name: '' }] }
  ]) assert.throws(() => validateCatalogueCategoryPage(broken, { expectedPage: 1, expectedPageSize: 100 }), /invalid catalogue data/i)
})

test('continuation pages reject false totals, malformed flags, partial nonterminal pages and full terminal pages', () => {
  const full = Array.from({ length: 100 }, (_, index) => category(index + 1))
  assert.equal(validateCatalogueCategoryPage(continuation(full, 1, true)).hasMore, true)
  assert.equal(validateCatalogueCategoryPage(continuation([], 3, false)).items.length, 0)
  for (const broken of [
    { ...continuation(full, 1, true), total: 101 }, { ...continuation(full, 1, true), totalPages: 2 },
    continuation(full.slice(0, 99), 1, true), continuation(full, 1, false),
    { ...continuation(full, 1, true), hasMore: 'true' }, { ...continuation([], 3, false), extra: 'private' }
  ]) assert.throws(() => validateCatalogueCategoryPage(broken), /invalid catalogue data/i)
})

const withPages = (context, respond) => {
  const previousWindow = globalThis.window
  globalThis.window = { setTimeout, clearTimeout }
  context.after(() => { globalThis.window = previousWindow })
  const requested = []
  context.mock.method(globalThis, 'fetch', async url => {
    const page = Number(new URL(String(url), 'https://example.test').searchParams.get('page'))
    requested.push(page)
    return new Response(JSON.stringify(respond(page)), { status: 200 })
  })
  return requested
}

test('authoritative total or page-count drift still rejects all category results', async context => {
  for (const changedTotal of [202, 301]) await context.test(String(changedTotal), async child => {
    const requested = withPages(child, page => pageOf(Array.from({ length: 100 }, (_, index) => category((page - 1) * 100 + index + 1)), page, page === 1 ? 201 : changedTotal))
    await assert.rejects(styleService.listCanonicalStyleOptions(), /inconsistent style data/i)
    assert.deepEqual(requested, [1, 2])
  })
})

test('a switch between exact and continuation modes cannot publish a mixed inventory', async context => {
  for (const first of ['exact', 'continuation']) await context.test(first, async child => {
    const requested = withPages(child, page => {
      const items = Array.from({ length: 100 }, (_, index) => category((page - 1) * 100 + index + 1))
      return (page === 1 ? first === 'exact' : first !== 'exact') ? pageOf(items, page, 201) : continuation(items, page, true)
    })
    await assert.rejects(styleService.listCanonicalStyleOptions(), /inconsistent style data/i)
    assert.deepEqual(requested, [1, 2])
  })
})

test('continuation reads stop at the existing 25-page bound without requesting a 26th page', async context => {
  const requested = withPages(context, page => continuation(Array.from({ length: 100 }, (_, index) => category((page - 1) * 100 + index + 1)), page, true))
  await assert.rejects(styleService.listCanonicalStyleOptions(), /inconsistent style data/i)
  assert.equal(requested.length, 25)
  assert.equal(requested.at(-1), 25)
})

test('the final allowed page can complete an exact inventory or a short continuation inventory', async context => {
  for (const mode of ['exact', 'continuation']) await context.test(mode, async child => {
    const total = mode === 'exact' ? 2500 : 2499
    const requested = withPages(child, page => {
      const length = page === 25 ? total - 2400 : 100
      const items = Array.from({ length }, (_, index) => category((page - 1) * 100 + index + 1))
      return mode === 'exact' ? pageOf(items, page, total) : continuation(items, page, page < 25)
    })
    assert.equal((await styleService.listCanonicalStyleOptions()).length, total)
    assert.equal(requested.length, 25)
  })
})

test('duplicate IDs across continuation pages reject the complete inventory', async context => {
  const requested = withPages(context, page => continuation(page === 1
    ? Array.from({ length: 100 }, (_, index) => category(index + 1))
    : [category(1)], page, page === 1))
  await assert.rejects(styleService.listCanonicalStyleOptions(), /inconsistent style data/i)
  assert.deepEqual(requested, [1, 2])
})

test('Add Beer includes canonical categories that have no products and traverses every page', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { setTimeout, clearTimeout }
  const requests = []
  const categories = Array.from({ length: 101 }, (_, index) => category(index + 1))
  globalThis.fetch = async (url) => {
    const request = String(url)
    requests.push(request)
    const page = Number(new URL(request, 'https://example.test').searchParams.get('page'))
    const items = page === 1 ? categories.slice(0, 100) : categories.slice(100)
    return new Response(JSON.stringify(pageOf(items, page, 101)), {
      status: 200, headers: { 'content-type': 'application/json' }
    })
  }
  try {
    const rows = await styleService.listCanonicalStyleOptions()
    assert.equal(rows.length, 101)
    assert.equal(rows[100].style.id, 101)
    assert.equal(Object.isFrozen(rows), true)
    assert.deepEqual(requests, [
      '/api/nocodebackend/catalog/categories?page=1&limit=100',
      '/api/nocodebackend/catalog/categories?page=2&limit=100'
    ])
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('invalid duplicate categories on distinct pages stop creation, never silently choose one', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async (url) => {
    const page = Number(new URL(String(url), 'https://example.test').searchParams.get('page'))
    const items = page === 1
      ? Array.from({ length: 100 }, (_, index) => category(index + 1))
      : [category(1)]
    return new Response(JSON.stringify(pageOf(items, page, 101)), {
      status: 200, headers: { 'content-type': 'application/json' }
    })
  }
  try {
    await assert.rejects(styleService.listCanonicalStyleOptions(), /inconsistent style data/i)
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
