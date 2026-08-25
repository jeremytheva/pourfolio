import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCatalogueCertificationEvidence, digestSearchQuery } from './catalogueEvidence.js'

const releaseSha = 'a'.repeat(40)
const observedAt = '2026-08-25T07:00:00.000Z'
const querySha256 = digestSearchQuery('lager')

const validInput = () => ({
  releaseSha,
  observedAt,
  browsePages: [
    { page: 1, totalPages: 2, totalItems: 3, itemIds: ['2', '1'] },
    { page: 2, totalPages: 2, totalItems: 3, itemIds: ['3'] }
  ],
  search: { querySha256, page: 1, totalPages: 1, totalItems: 1, itemIds: ['2'] },
  detail: { productId: '2' }
})

test('builds deterministic privacy-minimised connected catalogue evidence', () => {
  const first = buildCatalogueCertificationEvidence(validInput())
  const second = buildCatalogueCertificationEvidence(validInput())
  assert.deepEqual(first, second)
  assert.equal(first.schema, 'pourfolio.connected-catalogue-evidence.v1')
  assert.equal(first.releaseSha, releaseSha)
  assert.equal(first.browse.totalItems, 3)
  assert.equal(first.browse.itemCountObserved, 3)
  assert.equal(first.search.totalItems, 1)
  assert.equal(first.detail.productId, '2')
  assert.match(first.bundleSha256, /^[0-9a-f]{64}$/)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.browse), true)
})

test('never retains search text or catalogue display values', () => {
  const evidence = buildCatalogueCertificationEvidence(validInput())
  const text = JSON.stringify(evidence)
  assert.equal(text.includes('lager'), false)
  for (const forbidden of ['product_name', 'producer_name', 'category_name', 'user_id', 'email', 'rating', 'cellar', 'cookie', 'authorization']) {
    assert.equal(text.toLowerCase().includes(forbidden), false)
  }
})

test('rejects unexpected private or display fields instead of retaining them', () => {
  const input = validInput()
  input.browsePages[0].product_name = 'Private accidental field'
  assert.throws(() => buildCatalogueCertificationEvidence(input), /fields are invalid/)

  const searchInput = validInput()
  searchInput.search.user_id = 'owner'
  assert.throws(() => buildCatalogueCertificationEvidence(searchInput), /fields are invalid/)
})

test('requires canonical full SHA, UTC time and stable positive identifiers', () => {
  assert.throws(() => buildCatalogueCertificationEvidence({ ...validInput(), releaseSha: 'abc' }), /full lowercase release SHA/)
  assert.throws(() => buildCatalogueCertificationEvidence({ ...validInput(), observedAt: '2026-08-25' }), /canonical UTC timestamp/)
  const zero = validInput(); zero.browsePages[0].itemIds = ['0']
  assert.throws(() => buildCatalogueCertificationEvidence(zero), /invalid stable product id/)
  const leading = validInput(); leading.detail.productId = '02'
  assert.throws(() => buildCatalogueCertificationEvidence(leading), /invalid stable product id/)
})

test('requires contiguous internally consistent browse observations', () => {
  const missingPage = validInput(); missingPage.browsePages = [missingPage.browsePages[1]]
  assert.throws(() => buildCatalogueCertificationEvidence(missingPage), /contiguous from page 1/)
  const drift = validInput(); drift.browsePages[1].totalItems = 4
  assert.throws(() => buildCatalogueCertificationEvidence(drift), /metadata is inconsistent/)
  const duplicate = validInput(); duplicate.browsePages[1].itemIds = ['1']
  assert.throws(() => buildCatalogueCertificationEvidence(duplicate), /unique across pages/)
})

test('binds direct detail evidence to an identity observed in browse or search', () => {
  const input = validInput(); input.detail.productId = '99'
  assert.throws(() => buildCatalogueCertificationEvidence(input), /not observed in browse or search/)
})

test('search query digest is deterministic without retaining the query', () => {
  assert.equal(digestSearchQuery('lager'), querySha256)
  assert.notEqual(digestSearchQuery('ale'), querySha256)
  assert.throws(() => digestSearchQuery(''), /query is required/)
})
