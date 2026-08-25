import assert from 'node:assert/strict'
import test from 'node:test'
import { auditCatalogue } from '../audit-catalogue-source.js'

const row = (values, number = 2) => ({ __row: number, user_id: '', ...values })
const valid = () => ({
  producers: [row({ id: '10', producer_name: 'Brewery' })],
  categories: [row({ id: '1', category_name: 'Beverage', parent_id: '' }), row({ id: '2', category_name: 'Beer', parent_id: '1' }, 3)],
  products: [row({ id: '100', product_name: 'Pale Ale', producer_id: '10', product_category_id: '2', abv: '5.2', ibu: '30', collaboration: 'false' })]
})

test('valid catalogue passes deterministically', () => {
  const input = valid()
  const first = auditCatalogue({ ...input, rootCategoryId: '1' })
  const second = auditCatalogue({ ...input, rootCategoryId: '1' })
  assert.equal(first.status, 'PASS')
  assert.deepEqual(first, second)
})

test('producer and category orphans block catalogue', () => {
  const input = valid()
  input.products.push(row({ id: '101', product_name: 'Orphan', producer_id: '99', product_category_id: '99', collaboration: '0' }, 3))
  const result = auditCatalogue({ ...input, rootCategoryId: '1' })
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.countsByCode.MISSING_PRODUCER_REFERENCE, 1)
  assert.equal(result.countsByCode.MISSING_CATEGORY_REFERENCE, 1)
})

test('self-linked category and invalid ancestry are detected', () => {
  const input = valid()
  input.categories.push(row({ id: '3', category_name: 'IPA', parent_id: '3' }, 4))
  input.products[0].product_category_id = '3'
  const result = auditCatalogue({ ...input, rootCategoryId: '1' })
  assert.equal(result.countsByCode.CATEGORY_SELF_LINK, 1)
  assert.ok(result.countsByCode.CATEGORY_CYCLE >= 1)
  assert.equal(result.countsByCode.PRODUCT_CATEGORY_ANCESTRY_INVALID, 1)
})

test('duplicate browse sort keys, ownership and unsafe text are privacy-safe blockers', () => {
  const input = valid()
  input.products[0].user_id = 'private-owner'
  input.products.push(row({ id: '101', product_name: ' pale   ale ', producer_id: '10', product_category_id: '2', collaboration: 'yes' }, 3))
  input.producers[0].producer_name = 'Brewery �'
  const result = auditCatalogue({ ...input, rootCategoryId: '1' })
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.countsByCode.CATALOGUE_OWNER_NOT_BLANK, 1)
  assert.ok(result.countsByCode.DUPLICATE_PRODUCT_SORT_KEY >= 2)
  assert.equal(result.countsByCode.PUBLIC_TEXT_ENCODING_SUSPECT, 1)
  assert.equal(JSON.stringify(result).includes('private-owner'), false)
  assert.equal(JSON.stringify(result).includes('Brewery �'), false)
})

test('control characters in public text are detected without echoing source text', () => {
  const input = valid()
  input.products[0].product_name = `Pale${String.fromCharCode(7)} Ale`
  const result = auditCatalogue({ ...input, rootCategoryId: '1' })
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.countsByCode.PUBLIC_TEXT_CONTROL_CHARACTER, 1)
  assert.equal(JSON.stringify(result).includes(input.products[0].product_name), false)
})

test('malformed optional numeric and collaboration fields fail closed', () => {
  const input = valid()
  input.products[0].abv = 'unknown'
  input.products[0].ibu = '-1'
  input.products[0].collaboration = 'maybe'
  const result = auditCatalogue({ ...input, rootCategoryId: '1' })
  assert.equal(result.countsByCode.INVALID_OPTIONAL_NUMBER, 2)
  assert.equal(result.countsByCode.INVALID_COLLABORATION_FLAG, 1)
})
