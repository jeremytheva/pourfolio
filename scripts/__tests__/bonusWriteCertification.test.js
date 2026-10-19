import assert from 'node:assert/strict'
import test from 'node:test'
import { DEPLOYED_COLLECTIONS as C } from '../../src/data/contract.js'
import { cleanupBonusTestFixture, runBonusWriteCertification } from '../bonus-write-certification-lib.js'

const userId = 'test-owner-private'
const runKey = 'bonus-12345678-1234-4234-8234-123456789abc'
const A = C.bonusAttributes
const M = C.bonusAttributeCategoryMappings
const R = C.bonusRatingMappings
const K = C.bonusAttributeCategories
const fail = (code) => Object.assign(new Error('Do not disclose provider details'), { code })

const fixture = (options = {}) => {
  const rows = {
    [A]: [{ id: 1, user_id: null, description: 'Existing global', point_value: 0.5 }],
    [M]: [{ id: 2, user_id: null, category_id: 10, bonus_attribute_id: 1 }],
    [K]: [{ id: 10, user_id: null, category: 'Overall' }],
    [R]: [{ id: 3, user_id: 'another-owner', rating_id: 99, bonus_attribute_id: 1 }]
  }
  const calls = []
  const provider = {
    async listPage(collection) {
      if (options.readFailure === collection) throw fail('PROVIDER_ERROR')
      return { items: rows[collection].map((row) => ({ ...row })), totalPages: 1 }
    },
    async create(collection, body) {
      calls.push(['create', collection])
      if (options.echoExisting && collection === A) return { id: 1 }
      const id = collection === A ? 201 : 501
      rows[collection].push({ id, ...body,
        ...(collection === A && options.pointMismatch ? { point_value: 0.2 } : {}),
        ...(collection === M && options.mappingOwnerMismatch ? { user_id: 'foreign-owner' } : {}) })
      if (options.lostResponse === collection) throw fail('PROVIDER_ERROR')
      return { id }
    },
    async get(collection, id) {
      const row = rows[collection].find((item) => String(item.id) === String(id))
      if (!row) return null
      return { ...row, ...(collection === A && String(id) === '201' && options.ownerMismatch
        ? { user_id: 'foreign-owner' } : {}) }
    },
    async remove(collection, id) {
      calls.push(['delete', collection, String(id)])
      if (options.keepDeleted === collection) return { deleted: true }
      rows[collection] = rows[collection].filter((row) => String(row.id) !== String(id))
      return { deleted: true }
    }
  }
  return { rows, calls, provider, run: (overrides = {}) => runBonusWriteCertification({ provider, userId, runKey, ...overrides }) }
}

for (const invalid of [{ attributeId: '201/other' }, { description: 'An ordinary existing attribute' }]) {
  test(`reviewed cleanup rejects invalid scope ${Object.keys(invalid)[0]} before reads or deletes`, async () => {
    const f = fixture()
    const report = { deletesAttempted: 0, removed: 0 }
    await cleanupBonusTestFixture({ provider: f.provider, userId, attributeId: '201', mappingId: '501', categoryId: 10,
      description: `Pourfolio release QA ${runKey}`, report, ...invalid })
    assert.equal(report.cleanupFailure, 'BONUS_CLEANUP_SCOPE_UNCONFIRMED')
    assert.equal(report.deletesAttempted, 0)
    assert.deepEqual(f.calls, [])
  })
}

test('reviewed partial recovery proves the old child absent and deletes only its unchanged parent', async () => {
  const f = fixture()
  f.rows[A].push({ id: 201, user_id: userId, description: `Pourfolio release QA ${runKey}`, point_value: 0.7 })
  const report = { deletesAttempted: 0, removed: 0 }
  await cleanupBonusTestFixture({ provider: f.provider, userId, attributeId: '201', mappingId: '501', categoryId: 10,
    description: `Pourfolio release QA ${runKey}`, report, allowAbsentMapping: true })
  assert.equal(report.cleanup, 'PASS')
  assert.equal(report.priorMappingAbsence, 'CONFIRMED')
  assert.equal(report.removed, 1)
  assert.deepEqual(f.calls, [['delete', A, '201']])
})

test('bounded stale readback retries only reads and never repeats a delete', async () => {
  const f = fixture()
  const attribute = { id: 201, user_id: userId, description: `Pourfolio release QA ${runKey}`, point_value: 0.7 }
  f.rows[A].push(attribute)
  const originalGet = f.provider.get
  let staleReads = 0
  f.provider.get = async (collection, id) => {
    const row = await originalGet(collection, id)
    if (collection === A && String(id) === '201' && row === null && staleReads++ < 2) return { ...attribute }
    return row
  }
  const report = { deletesAttempted: 0, removed: 0 }
  await cleanupBonusTestFixture({ provider: f.provider, userId, attributeId: '201', mappingId: '501', categoryId: 10,
    description: attribute.description, report, allowAbsentMapping: true, settleAttempts: 3, wait: async () => {} })
  assert.equal(report.cleanup, 'PASS')
  assert.equal(report.absenceReadAttempts.attribute, 3)
  assert.deepEqual(f.calls, [['delete', A, '201']])
})

test('bounded readback does not accept a foreign replacement record as the old fixture', async () => {
  const f = fixture()
  const description = `Pourfolio release QA ${runKey}`
  f.rows[A].push({ id: 201, user_id: userId, description, point_value: 0.7 })
  const originalGet = f.provider.get
  f.provider.get = async (collection, id) => {
    const row = await originalGet(collection, id)
    return collection === A && String(id) === '201' && row === null
      ? { id: 201, user_id: 'another-owner', description } : row
  }
  const report = { deletesAttempted: 0, removed: 0 }
  await cleanupBonusTestFixture({ provider: f.provider, userId, attributeId: '201', mappingId: '501', categoryId: 10,
    description, report, allowAbsentMapping: true, settleAttempts: 3, wait: async () => {} })
  assert.equal(report.cleanup, 'UNCONFIRMED')
  assert.equal(report.absenceReadAttempts.attribute, 1)
  assert.equal(report.cleanupFailure, 'BONUS_ATTRIBUTE_DELETE_UNCONFIRMED')
  assert.deepEqual(f.calls, [['delete', A, '201']])
})

test('candidate persistence and reload pass, then only its two acknowledged rows are removed child-first', async () => {
  const f = fixture()
  const baseline = structuredClone(f.rows)
  const result = await f.run()
  assert.equal(result.status, 'PASS')
  assert.equal(result.persistence, 'PASS')
  assert.equal(result.reload, 'PASS')
  assert.equal(result.cleanup, 'PASS')
  assert.equal(result.createsAttempted, 2)
  assert.equal(result.deletesAttempted, 2)
  assert.equal(result.removed, 2)
  assert.deepEqual(f.calls, [['create', A], ['create', M], ['delete', M, '501'], ['delete', A, '201']])
  assert.deepEqual(f.rows, baseline)
  const text = JSON.stringify(result)
  for (const privateValue of [userId, runKey, '201', '501', 'Existing global']) assert.equal(text.includes(privateValue), false)
})

test('an unresolved earlier fixture blocks a fresh test before all writes', async () => {
  const f = fixture()
  f.rows[A].push({ id: 9, user_id: userId,
    description: 'Pourfolio release QA bonus-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', point_value: 0.7 })
  const result = await f.run()
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.failure, 'BONUS_PRIOR_FIXTURE_UNRESOLVED')
  assert.equal(result.createsAttempted, 0)
  assert.equal(result.deletesAttempted, 0)
  assert.deepEqual(f.calls, [])
})

test('a failed later verification still cleans only the acknowledged fixture and preserves the error code', async () => {
  const f = fixture()
  const result = await f.run({ verify: async () => { throw fail('POST_SAVE_VERIFICATION_FAILED') } })
  assert.equal(result.status, 'FAIL')
  assert.equal(result.cleanup, 'PASS')
  assert.equal(result.failure, 'POST_SAVE_VERIFICATION_FAILED')
  assert.equal(f.rows[A].length, 1)
})

test('a known create ID cannot become a cleanup target', async () => {
  const f = fixture({ echoExisting: true })
  const baseline = structuredClone(f.rows)
  const result = await f.run()
  assert.equal(result.status, 'FAIL')
  assert.equal(result.cleanup, 'UNCONFIRMED')
  assert.equal(result.failure, 'BONUS_CREATE_ID_UNCONFIRMED')
  assert.equal(result.deletesAttempted, 0)
  assert.deepEqual(f.rows, baseline)
})

for (const lostResponse of [A, M]) {
  test(`a lost ${lostResponse} response never triggers guessed deletion or a retry`, async () => {
    const f = fixture({ lostResponse })
    const result = await f.run()
    assert.equal(result.status, 'FAIL')
    assert.equal(result.cleanup, 'UNCONFIRMED')
    assert.equal(result.deletesAttempted, 0)
    assert.equal(f.calls.filter(([action]) => action === 'create').length, lostResponse === A ? 1 : 2)
    assert.equal(f.rows[A].length, 2)
  })
}

for (const option of ['ownerMismatch', 'mappingOwnerMismatch']) {
  test(`${option} blocks all cleanup rather than removing an unverified row`, async () => {
    const f = fixture({ [option]: true })
    const result = await f.run()
    assert.equal(result.status, 'FAIL')
    assert.equal(result.cleanup, 'UNCONFIRMED')
    assert.equal(result.deletesAttempted, 0)
    assert.equal(f.rows[A].length, 2)
  })
}

test('a changed value fails persistence but its new owner/nonce-proven unused fixture can still be cleaned', async () => {
  const f = fixture({ pointMismatch: true })
  const result = await f.run()
  assert.equal(result.status, 'FAIL')
  assert.equal(result.failure, 'BONUS_ATTRIBUTE_PERSISTENCE_MISMATCH')
  assert.equal(result.cleanup, 'PASS')
  assert.equal(result.createsAttempted, 1)
  assert.deepEqual(f.calls, [['create', A], ['delete', A, '201']])
})

test('any persisted rating reference protects both fixture records from cleanup', async () => {
  const f = fixture()
  const result = await f.run({ verify: async () => {
    f.rows[R].push({ id: 4, rating_id: 100, user_id: userId, bonus_attribute_id: 201 })
  } })
  assert.equal(result.cleanup, 'UNCONFIRMED')
  assert.equal(result.cleanupFailure, 'BONUS_FIXTURE_IS_REFERENCED')
  assert.equal(result.deletesAttempted, 0)
})

test('an unacknowledged category relationship prevents cleanup', async () => {
  const f = fixture()
  const result = await f.run({ verify: async () => {
    f.rows[M].push({ id: 502, category_id: 10, user_id: userId, bonus_attribute_id: 201 })
  } })
  assert.equal(result.cleanup, 'UNCONFIRMED')
  assert.equal(result.cleanupFailure, 'BONUS_CLEANUP_MAPPING_UNCONFIRMED')
  assert.equal(result.deletesAttempted, 0)
})

for (const keepDeleted of [A, M]) {
  test(`a successful delete acknowledgement with retained ${keepDeleted} cannot pass cleanup`, async () => {
    const f = fixture({ keepDeleted })
    const result = await f.run()
    assert.equal(result.status, 'FAIL')
    assert.equal(result.cleanup, 'UNCONFIRMED')
    assert.equal(result.removed, keepDeleted === M ? 0 : 1)
    assert.equal(f.rows[A].length, 2)
  })
}

test('missing owner or unreadable baseline causes no provider writes', async () => {
  for (const option of [null, R, A]) {
    const f = fixture({ readFailure: option })
    const result = await f.run(option === null ? { userId: '' } : {})
    assert.equal(result.status, 'BLOCKED')
    assert.equal(result.createsAttempted, 0)
    assert.deepEqual(f.calls, [])
  }
})

test('a later baseline page failure prevents mutation', async () => {
  const f = fixture()
  const original = f.provider.listPage
  f.provider.listPage = async (collection, args) => {
    if (collection === A && args.page === 2) throw fail('PROVIDER_ERROR')
    const result = await original(collection, args)
    return collection === A ? { ...result, totalPages: 2 } : result
  }
  const result = await f.run()
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.createsAttempted, 0)
  assert.deepEqual(f.calls, [])
})

test('failure to read references during cleanup preserves both errors and issues no deletion', async () => {
  const f = fixture()
  const original = f.provider.listPage
  const result = await f.run({ verify: async () => {
    f.provider.listPage = async (collection, args) => {
      if (collection === R) throw fail('REFERENCE_READ_FAILED')
      return original(collection, args)
    }
    throw fail('ORIGINAL_CHECK_FAILED')
  } })
  assert.equal(result.failure, 'ORIGINAL_CHECK_FAILED')
  assert.equal(result.cleanupFailure, 'REFERENCE_READ_FAILED')
  assert.equal(result.deletesAttempted, 0)
})
