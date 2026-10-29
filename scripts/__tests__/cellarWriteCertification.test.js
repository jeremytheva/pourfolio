import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cellarCertificationScope, runCellarWriteCertification } from '../cellar-write-certification-lib.js'
import { dataProvider } from '../../api/_lib/dataProvider.js'
import { routeCellarRequest } from '../../api/cellar-data-proxy.js'

const runKey = 'cellar-12345678-1234-1234-1234-123456789abc'
const marker = `Pourfolio release QA ${runKey}`

test('default full certification blocks incomplete second-account configuration', () => {
  assert.throws(() => cellarCertificationScope({ CELLAR_CERTIFICATION_SHA: 'c'.repeat(40),
    CELLAR_CERTIFICATION_CONFIRMATION: 'RUN CURRENT INSTANCE CELLAR TEST',
    RELEASE_OTHER_PASSWORD: 'private-value' }), { code: 'CELLAR_SECOND_ACCOUNT_CONFIGURATION_INCOMPLETE' })
})

test('owner-only verification requires its explicit bounded scope and matching confirmation', () => {
  const environment = { CELLAR_CERTIFICATION_SHA: 'c'.repeat(40), CELLAR_CERTIFICATION_SCOPE: 'owner-crud-only',
    CELLAR_CERTIFICATION_CONFIRMATION: 'RUN CURRENT INSTANCE OWNER CELLAR TEST' }
  assert.equal(cellarCertificationScope(environment), 'owner-crud-only')
  assert.throws(() => cellarCertificationScope({ ...environment,
    CELLAR_CERTIFICATION_CONFIRMATION: 'RUN CURRENT INSTANCE CELLAR TEST' }), { code: 'CELLAR_EXECUTION_GUARD_MISSING' })
})

test('full certification requires both supported other-account credential fields', () => {
  assert.equal(cellarCertificationScope({ CELLAR_CERTIFICATION_SHA: 'c'.repeat(40),
    CELLAR_CERTIFICATION_CONFIRMATION: 'RUN CURRENT INSTANCE CELLAR TEST',
    RELEASE_OTHER_EMAIL: 'second@example.invalid', RELEASE_OTHER_PASSWORD: 'private-value' }), 'owner-and-isolation')
})
const fixture = (changes = {}) => {
  const rows = [{ id: 5, product_id: 1, user_id: 'owner-a', quantity: 8, notes: 'Existing item' }]
  const calls = []
  const provider = {
    async listPage(collection, options) {
      const all = collection === 'products' ? [{ id: 1, producer_id: null, product_category_id: null }]
        : rows.filter(row => !options.filters?.user_id || row.user_id === options.filters.user_id).map(row => ({ ...row }))
      const { page, limit } = options
      return { items: all.slice((page - 1) * limit, page * limit), page, pageSize: limit,
        total: all.length, totalPages: Math.ceil(all.length / limit) }
    },
    async list(_collection, filters = {}) { return rows.filter((row) => !filters.user_id || row.user_id === filters.user_id).map((row) => ({ ...row })) },
    async get(collection, id) {
      if (collection === 'products') return { id: 1, producer_id: null, product_category_id: null }
      const row = rows.find((value) => String(value.id) === String(id))
      return row ? { ...row } : null
    },
    async create(collection, body) { calls.push(['create', collection]); rows.push({ ...body, id: 6 }); return { id: 6 } },
    async update(collection, id, body) { calls.push(['update', collection, String(id)]); Object.assign(rows.find((row) => String(row.id) === String(id)), body); return { id } },
    async remove(collection, id) { calls.push(['remove', collection, String(id)]); rows.splice(rows.findIndex((row) => String(row.id) === String(id)), 1) },
    ...changes
  }
  const run = (options = {}) => runCellarWriteCertification({ provider, userId: 'owner-a', otherUserId: 'owner-b', runKey, ...options })
  return { rows, calls, provider, run }
}

test('candidate cellar gateway verifies CRUD, null relationships, gift values and distinct-owner denial with exact cleanup', async () => {
  const { run, rows, calls } = fixture()
  const stages = []
  const report = await run({ checkpoint: async (value) => stages.push(value) })
  assert.equal(report.status, 'PASS')
  for (const field of ['create', 'reload', 'update', 'nullableRelationships', 'giftRoundTrip', 'otherOwnerPolicy', 'cleanup']) assert.equal(report[field], 'PASS')
  assert.deepEqual(calls, [['create', 'cellar'], ['update', 'cellar', '6'], ['remove', 'cellar', '6']])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].quantity, 8)
  assert.equal(report.httpSessionMiddleware, 'NOT_RUN')
  assert.deepEqual(stages.map((value) => value.stage), ['create-intent', 'create-acknowledged', 'update-intent', 'delete-intent', 'finished'])
  assert.equal(stages[1].createdId, '6')
  assert.ok(!JSON.stringify(report).includes(marker))
  assert.ok(!JSON.stringify(report).includes('owner-a'))
})

test('missing second account retains a partial outcome without inventing ownership evidence', async () => {
  const { run } = fixture()
  const result = await run({ otherUserId: null })
  assert.equal(result.status, 'PARTIAL')
  assert.equal(result.otherOwnerPolicy, 'NOT_RUN')
  assert.equal(result.cleanup, 'PASS')
})

test('the live candidate test uses the real client projection and still verifies nullable defaults', async () => {
  const context = fixture()
  const create = context.provider.create.bind(context.provider)
  let sent
  context.provider.create = async (collection, body) => { sent = { ...body }; return create(collection, body) }
  const result = await context.run()
  assert.equal(result.status, 'PASS')
  assert.equal(result.nullableRelationships, 'PASS')
  for (const field of ['sharing_series_id', 'series_version_id', 'location_id', 'purchase_location_id', 'purchased_by_id', 'bet_id']) {
    assert.equal(Object.hasOwn(sent, field), false)
  }
  assert.equal(sent.quantity, 1)
  assert.equal(sent.gift, 0)
})

test('provider failure evidence retains only HTTP status, operation and field types', async () => {
  const context = fixture({ create: async () => { throw Object.assign(new Error('private-cookie private-body'), {
    status: 502, code: 'PROVIDER_ERROR', providerStatus: 400, providerOperation: 'create/cellar',
    providerErrorKind: 'error_field', providerRequestShape: 'gift:number,notes:string,user_id:string',
    payload: { error: 'private-body' }, cookie: 'private-cookie'
  }) } })
  const result = await context.run()
  assert.equal(result.failureStage, 'create')
  assert.deepEqual(result.gatewayFailures, [{ method: 'POST', status: 502, code: 'PROVIDER_ERROR',
    providerStatus: 400, providerOperation: 'create/cellar', providerErrorKind: 'error_field',
    providerRequestShape: 'gift:number,notes:string,user_id:string' }])
  assert.equal(result.createsAttempted, 1)
  assert.equal(result.deletesAttempted, 0)
  assert.ok(!JSON.stringify(result).includes('private-cookie'))
  assert.ok(!JSON.stringify(result).includes('private-body'))
})

test('readback evidence retains field names and bounded counts without private values', async () => {
  const context = fixture()
  const report = await context.run({ route: async () => { throw Object.assign(new Error('private-value'), {
    status: 502, code: 'CELLAR_PERSISTENCE_MISMATCH', mismatchFields: ['quantity', 'gift'],
    readbackState: 'MISMATCH', readbackAttempts: 6, actual: 'private-value'
  }) } })
  assert.deepEqual(report.gatewayFailures, [{ method: 'POST', status: 502, code: 'CELLAR_PERSISTENCE_MISMATCH',
    mismatchFields: ['gift', 'quantity'], readbackState: 'MISMATCH', readbackAttempts: 6 }])
  assert.ok(!JSON.stringify(report).includes('private-value'))
})

test('same-account identity and malformed run keys block before writing', async () => {
  for (const options of [{ otherUserId: 'owner-a' }, { runKey: 'not-a-nonce' }]) {
    const { run, calls } = fixture()
    const result = await run(options)
    assert.equal(result.status, 'BLOCKED')
    assert.equal(calls.length, 0)
  }
})

test('an unresolved earlier owned fixture blocks another create', async () => {
  const { run, rows, calls } = fixture()
  rows[0].notes = marker
  const result = await run()
  assert.equal(result.failure, 'CELLAR_PRIOR_FIXTURE_UNRESOLVED')
  assert.equal(calls.length, 0)
})

test('baseline and initial receipt failures prevent provider writes', async () => {
  const first = fixture({ listPage: async () => { throw new Error('unavailable') } })
  assert.equal((await first.run()).status, 'BLOCKED')
  assert.equal(first.calls.length, 0)
  const second = fixture()
  assert.equal((await second.run({ checkpoint: async () => { throw new Error('disk unavailable') } })).createsAttempted, 0)
  assert.equal(second.calls.length, 0)
})

test('an echoed existing identifier never authorises cleanup', async () => {
  const { run, rows, calls } = fixture({ create: async () => ({ id: 5 }) })
  const result = await run()
  assert.equal(result.failure, 'CELLAR_CREATE_ID_UNCONFIRMED')
  assert.equal(result.deletesAttempted, 0)
  assert.equal(result.cleanup, 'UNCONFIRMED')
  assert.equal(rows.length, 1)
  assert.equal(calls.length, 0)
})

test('a lost create acknowledgement never triggers history-difference cleanup or a create retry', async () => {
  const context = fixture()
  context.provider.create = async (_collection, body) => {
    context.calls.push(['create'])
    context.rows.push({ ...body, id: 6 })
    throw new Error('response lost')
  }
  const result = await context.run()
  assert.equal(result.createsAttempted, 1)
  assert.equal(result.deletesAttempted, 0)
  assert.equal(result.cleanup, 'UNCONFIRMED')
  assert.equal(context.calls.length, 1)
})

test('wrong-owner readback cannot become a deletion target', async () => {
  const context = fixture()
  context.provider.create = async (_collection, body) => {
    context.rows.push({ ...body, id: 6, user_id: 'foreign-owner' })
    return { id: 6 }
  }
  const result = await context.run()
  assert.equal(result.failure, 'CELLAR_PERSISTENCE_MISMATCH')
  assert.equal(result.cleanupFailure, 'CELLAR_CLEANUP_PROVENANCE_UNCONFIRMED')
  assert.equal(result.deletesAttempted, 0)
})

test('an unpersisted update fails but still removes only the proven new fixture', async () => {
  const context = fixture({ update: async () => ({ id: 6, quantity: 2 }) })
  const result = await context.run()
  assert.equal(result.failure, 'CELLAR_PERSISTENCE_MISMATCH')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.cleanup, 'PASS')
  assert.equal(context.rows.length, 1)
})

test('unconfirmed delete readback fails without repeating the mutation', async () => {
  const context = fixture({ remove: async () => ({ success: true }) })
  const result = await context.run()
  assert.equal(result.cleanup, 'UNCONFIRMED')
  assert.equal(result.cleanupFailure, 'CELLAR_DELETE_NOT_VERIFIED')
  assert.equal(result.deletesAttempted, 1)
  assert.equal(context.rows.length, 2)
})

test('a broken other-owner gateway cannot reach an actual provider mutation', async () => {
  const context = fixture()
  const route = async (request, response, user) => {
    if (user.id === 'owner-b' && request.method === 'DELETE') {
      await dataProvider.remove('cellar', request.query.path[1])
      response.status(204).end()
      return
    }
    return routeCellarRequest(request, response, user)
  }
  const result = await context.run({ route })
  assert.equal(result.failure, 'CELLAR_OTHER_OWNER_MUTATION_NOT_DENIED')
  assert.equal(result.deletesAttempted, 1)
  assert.equal(result.cleanup, 'PASS')
  assert.deepEqual(context.calls.filter(([op]) => op === 'remove'), [['remove', 'cellar', '6']])
})

test('adapter methods are restored after verification and cleanup failure', async () => {
  const before = { ...dataProvider }
  const context = fixture({ remove: async () => { throw new Error('unavailable') } })
  assert.equal((await context.run()).status, 'FAIL')
  for (const key of Object.keys(before)) assert.equal(dataProvider[key], before[key])
})
