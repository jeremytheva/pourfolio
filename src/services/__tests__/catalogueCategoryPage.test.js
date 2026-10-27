import assert from 'node:assert/strict'
import test from 'node:test'
import { validateCatalogueCategoryPage } from '../catalogueResponse.js'
import { styleService } from '../styleService.js'

const category = (id) => ({ id, category_name: `Category ${String(id).padStart(3, '0')}`, parent_id: null })
const pageOf = (items, page, total, pageSize = 100) => ({
  items, page, pageSize, total, totalPages: Math.ceil(total / pageSize)
})

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
    { ...valid, items: [category(1), { ...category(2), category_name: '' }] }
  ]) assert.throws(() => validateCatalogueCategoryPage(broken, { expectedPage: 1, expectedPageSize: 100 }), /invalid catalogue data/i)
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
