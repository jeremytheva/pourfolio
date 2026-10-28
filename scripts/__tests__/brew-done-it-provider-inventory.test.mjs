import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { COLLECTIONS, runBrewInventory, runBrewInventoryCli } from '../brew-done-it-provider-inventory.mjs'

const sourceCommit = 'a1'.repeat(20)
const providerRef = `sha256:${'b2'.repeat(32)}`
const options = { sourceCommit, providerRef, pageSize: 2, maxPages: 3 }
const row = id => ({ id, selected_product_id: 'private-beer', participant: 'private-person', invitation_digest: 'private-invitation' })
const page = (items, number = 1, total = items.length, pageSize = 2) => ({
  items, page: number, pageSize, total, totalPages: Math.ceil(total / pageSize)
})
const makeProvider = (read = () => page([])) => {
  const calls = []
  const forbidden = () => assert.fail('Inventory must never invoke a provider mutation or individual record read')
  return {
    calls, create: forbidden, update: forbidden, compareAndSet: forbidden, remove: forbidden, get: forbidden, list: forbidden,
    async listPage(collection, request) { calls.push({ collection, ...request }); return read(collection, request, calls.length) }
  }
}
const env = () => ({
  RUN_BREW_READONLY_INVENTORY: '1', BREW_INVENTORY_SOURCE_SHA: sourceCommit, GITHUB_SHA: sourceCommit,
  GITHUB_REF: 'refs/heads/main', NOCODEBACKEND_DATA_BASE_URL: 'https://api.nocodebackend.com/',
  NOCODEBACKEND_INSTANCE: 'private-instance', NOCODEBACKEND_SECRET_KEY: 'private-credential'
})

test('empty inventory makes exactly two GET observations of the four allowlisted collections', async () => {
  const provider = makeProvider()
  const result = await runBrewInventory({ provider, ...options })
  assert.equal(result.status, 'PASS')
  assert.equal(provider.calls.length, 8)
  assert.deepEqual(result.collections.map(value => value.collection), COLLECTIONS)
  assert.ok(result.collections.every(value => value.rowCount === 0 && value.pagesRead === 2))
  for (const call of provider.calls) {
    assert.ok(COLLECTIONS.includes(call.collection))
    assert.deepEqual(call.filters, {})
    assert.equal(call.fresh, true)
    assert.equal(call.orderBy, 'id')
  }
  for (const field of ['schemaConstraints', 'providerCertification', 'privacyCertification', 'recoveryCertification', 'twoAccountFlow']) {
    assert.equal(result[field], 'NOT_RUN')
  }
  assert.equal(result.releaseReadiness, 'BLOCKED')
  assert.equal(result.observation, 'TWO_BOUNDED_READS_NOT_ATOMIC_SNAPSHOT')
})

test('exact multi-page counts and private record values never enter retained evidence', async () => {
  const provider = makeProvider((collection, request) => page(request.page === 1 ? [row(1), row(2)] : [row(3)], request.page, 3))
  const result = await runBrewInventory({ provider, ...options })
  assert.equal(result.status, 'PASS')
  assert.ok(result.collections.every(value => value.rowCount === 3 && value.pagesRead === 4))
  const encoded = JSON.stringify(result)
  for (const value of ['private-beer', 'private-person', 'private-invitation', 'selected_product_id', 'invitation_digest', 'digest']) {
    assert.ok(!encoded.includes(value))
  }
})

test('estimated pagination supports both short and empty terminal pages', async () => {
  for (const terminal of [[], [row(3)]]) {
    const provider = makeProvider((collection, request) => request.page === 1
      ? { ...page([row(1), row(2)], 1, 3), totalIsEstimate: true }
      : { ...page(terminal, 2, 2 + terminal.length), totalPages: 2, totalIsEstimate: false })
    const result = await runBrewInventory({ provider, ...options })
    assert.equal(result.status, 'PASS')
    assert.ok(result.collections.every(value => value.rowCount === 2 + terminal.length))
  }
})

test('row and object-key reordering does not manufacture drift', async () => {
  const provider = makeProvider((collection, request, call) => page(call <= 4
    ? [{ id: 1, nested: { b: 2, a: 1 } }, row(2)]
    : [row(2), { nested: { a: 1, b: 2 }, id: 1 }]))
  assert.equal((await runBrewInventory({ provider, ...options })).status, 'PASS')
})

test('changed content or count between observations blocks preflight even with valid pages', async () => {
  for (const later of [[{ ...row(1), participant: 'changed-private-person' }], []]) {
    const provider = makeProvider((collection, request, call) => page(call <= 4 ? [row(1)] : later))
    const result = await runBrewInventory({ provider, ...options })
    assert.equal(result.status, 'BLOCKED')
    assert.equal(result.failure.code, 'INVENTORY_CHANGED')
    assert.equal(result.failure.collection, COLLECTIONS[0])
    assert.ok(!JSON.stringify(result).includes('changed-private-person'))
    assert.equal(provider.calls.length, 5)
  }
})

test('malformed pagination, partial pages and repeated IDs cannot certify completeness', async () => {
  const invalidPages = [
    null, {}, page([], 2), { ...page([]), pageSize: 99 },
    { ...page([]), total: -1 }, { ...page([]), totalPages: '0' },
    { ...page([]), totalIsEstimate: 'false' }, page([row(1)], 1, 3),
    page([row(1), row(1)]), page([{ id: 0 }]), page([null]),
    { ...page([row(1), row(2)]), totalIsEstimate: true },
    { ...page([row(1)], 1, 3), totalIsEstimate: true }
  ]
  for (const invalid of invalidPages) {
    const provider = makeProvider(() => invalid)
    const result = await runBrewInventory({ provider, ...options })
    assert.equal(result.status, 'BLOCKED')
    assert.equal(provider.calls.length, 1)
  }
  const repeated = makeProvider((collection, request) => page([row(1), row(2)], request.page, 4))
  assert.equal((await runBrewInventory({ provider: repeated, ...options })).failure.code, 'INVENTORY_ROW_INVALID')
})

test('pagination count drift and exact-to-estimated changes fail closed', async () => {
  for (const next of [page([row(3)], 2, 3), { ...page([row(3), row(4)], 2, 5), totalIsEstimate: true }]) {
    const provider = makeProvider((collection, request) => request.page === 1 ? page([row(1), row(2)], 1, 4) : next)
    assert.equal((await runBrewInventory({ provider, ...options })).status, 'BLOCKED')
  }
})

test('finite row/page bounds stop before an unbounded scan', async () => {
  const tooMany = makeProvider(() => page([row(1), row(2)], 1, 7))
  assert.equal((await runBrewInventory({ provider: tooMany, ...options })).failure.code, 'INVENTORY_LIMIT_REACHED')
  assert.equal(tooMany.calls.length, 1)
  const unending = makeProvider((collection, request) => ({
    ...page([row(request.page * 2), row(request.page * 2 + 1)], request.page, request.page * 2 + 1), totalIsEstimate: true
  }))
  assert.equal((await runBrewInventory({ provider: unending, ...options })).failure.code, 'INVENTORY_LIMIT_REACHED')
  assert.equal(unending.calls.length, 3)
})

test('invalid limits and provenance fail before provider access', async () => {
  for (const patch of [
    { pageSize: 0 }, { pageSize: 101 }, { maxPages: 11 }, { maxPages: 0 }, { pageSize: 1.5 },
    { sourceCommit: 'main' }, { sourceCommit: '0'.repeat(40) }, { providerRef: 'private-instance' },
    { capturedAt: 'private timestamp' }
  ]) {
    const provider = makeProvider()
    await assert.rejects(runBrewInventory({ provider, ...options, ...patch }), { code: 'INVENTORY_CONFIGURATION_INVALID' })
    assert.equal(provider.calls.length, 0)
  }
})

test('arbitrary provider exceptions are replaced by a fixed code', async () => {
  const provider = makeProvider(() => { throw Object.assign(new Error('private-credential private-record'), { code: 'private-code' }) })
  const result = await runBrewInventory({ provider, ...options })
  assert.deepEqual(result.failure, { collection: COLLECTIONS[0], code: 'INVENTORY_READ_FAILED' })
  assert.ok(!JSON.stringify(result).includes('private-'))
})

test('CLI guards reject arguments, unreviewed refs, missing credentials and noncanonical endpoints before loading a provider', async () => {
  for (const [args, patch] of [
    [['--write'], {}], [[], { RUN_BREW_READONLY_INVENTORY: '' }], [[], { GITHUB_REF: 'refs/heads/unreviewed' }],
    [[], { GITHUB_SHA: 'd4'.repeat(20) }], [[], { BREW_INVENTORY_SOURCE_SHA: 'main' }],
    [[], { NOCODEBACKEND_SECRET_KEY: '' }], [[], { NOCODEBACKEND_INSTANCE: '' }],
    [[], { NOCODEBACKEND_DATA_BASE_URL: 'https://untrusted.invalid/' }]
  ]) {
    let loaded = false
    await assert.rejects(runBrewInventoryCli(args, { env: { ...env(), ...patch }, loadProvider: async () => { loaded = true } }))
    assert.equal(loaded, false)
  }
})

test('guarded CLI retains a hashed provider reference and source identity only', async () => {
  const result = await runBrewInventoryCli([], {
    env: env(), loadProvider: async () => makeProvider(() => ({ ...page([], 1, 0, 100) }))
  })
  assert.equal(result.status, 'PASS')
  assert.equal(result.sourceCommit, sourceCommit)
  assert.match(result.providerRef, /^sha256:[a-f0-9]{64}$/)
  assert.ok(!JSON.stringify(result).includes('private-'))
})

test('actual CLI failure output is a redacted JSON summary with a failing exit status', () => {
  const child = spawnSync(process.execPath, ['scripts/brew-done-it-provider-inventory.mjs'], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8', env: { PATH: process.env.PATH }
  })
  assert.equal(child.status, 2)
  assert.equal(child.stderr, '')
  assert.deepEqual(JSON.parse(child.stdout), {
    status: 'BLOCKED', providerRead: 'READ_ONLY', releaseReadiness: 'BLOCKED', code: 'INVENTORY_EXECUTION_GUARD_REQUIRED'
  })
})

test('workflow keeps privileged reads main-only and retains only the fixed summary', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/brew-done-it-provider-inventory.yml', import.meta.url), 'utf8')
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/)
  assert.match(workflow, /environment: staging-release/)
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /npm run platform:validate/)
  assert.match(workflow, /git rev-parse HEAD/)
  assert.match(workflow, /contents: read/)
  assert.doesNotMatch(workflow, /pull_request_target|ALLOW_DESTRUCTIVE|BREW_DONE_IT_POLICY_ENABLED|test:brew-provider-contract/)
  assert.equal((workflow.match(/path: artifacts\//g) || []).length, 1)
  assert.match(workflow, /path: artifacts\/brew-readonly-inventory\/summary.json/)
})
