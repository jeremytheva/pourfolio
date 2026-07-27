import assert from 'node:assert/strict'
import test from 'node:test'
import { auditImportData, parseCsv } from '../audit-import-references.js'

test('CSV parsing supports quoted commas, newlines and escaped quotes', () => {
  const records = parseCsv(
    'id,name,notes\r\n1,"Beer, one","First line\nSecond line"\r\n2,Beer two,"Said ""hello"""\r\n'
  )

  assert.deepEqual(records, [
    { __row: 2, id: '1', name: 'Beer, one', notes: 'First line\nSecond line' },
    { __row: 3, id: '2', name: 'Beer two', notes: 'Said "hello"' }
  ])
})

test('preflight passes when catalogue relationships are complete', () => {
  const report = auditImportData({
    producers: [{ __row: 2, id: '9', producer_name: 'Brewery' }],
    products: [{ __row: 2, id: '20', product_name: 'Beer', producer_id: '9' }],
    ratings: [{ __row: 2, current_product_id: '20' }],
    cellar: [{ __row: 2, product_id: '20' }]
  })

  assert.equal(report.status, 'PASS')
  assert.equal(report.counts.blockers, 0)
})

test('preflight blocks zero producers and missing product references', () => {
  const report = auditImportData({
    producers: [{ __row: 2, id: '9', producer_name: 'Brewery' }],
    products: [{ __row: 2, id: '20', product_name: 'Beer', producer_id: '0' }],
    ratings: [
      { __row: 2, current_product_id: '20' },
      { __row: 3, current_product_id: '351' }
    ],
    cellar: [{ __row: 2, product_id: '357' }]
  })

  assert.equal(report.status, 'BLOCKED')
  assert.deepEqual(report.countsByCode, {
    MISSING_PRODUCER_REFERENCE: 1,
    MISSING_PRODUCT_REFERENCE: 2
  })
  assert.deepEqual(
    report.blockers.map(({ code, collection, value }) => ({ code, collection, value })),
    [
      { code: 'MISSING_PRODUCER_REFERENCE', collection: 'products', value: '0' },
      { code: 'MISSING_PRODUCT_REFERENCE', collection: 'ratings', value: '351' },
      { code: 'MISSING_PRODUCT_REFERENCE', collection: 'cellar', value: '357' }
    ]
  )
})

test('preflight rejects missing required headers', () => {
  assert.throws(
    () => auditImportData({
      producers: [{ __row: 2, id: '9', producer_name: 'Brewery' }],
      products: [{ __row: 2, id: '20', product_name: 'Beer' }]
    }),
    /producer_id/
  )
})
