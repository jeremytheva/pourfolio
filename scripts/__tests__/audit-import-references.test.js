import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { auditImportData, fingerprintCsv, parseCsv } from '../audit-import-references.js'

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

test('preflight validates completed bonus and cellar evidence ledgers', () => {
  const bonusDecisions = Array.from({ length: 10 }, (_, index) => ({
    __row: index + 2,
    'Source variant': `variant-${index + 1}`,
    'Source count': index === 0 ? '6' : '7',
    Decision: index === 9 ? 'rejected' : 'accepted',
    'Canonical bonus ID': index === 9 ? '' : String(index + 1),
    'Rejection reason': index === 9 ? 'Not a launch bonus attribute' : '',
    'Evidence reference': `PRIVATE-BONUS-${index + 1}`,
    Operator: 'operator-1',
    Reviewer: 'reviewer-1',
    'Reviewed at (UTC)': '2026-08-06T10:00:00Z'
  }))
  const cellarIdentity = Array.from({ length: 399 }, (_, index) => ({
    __row: index + 2,
    'Source record key': `source-${index + 1}`,
    'Verified owner ID': `provider-user-${index + 1}`,
    'Verification method': 'provider account match',
    'Evidence reference': `PRIVATE-EVIDENCE-${index + 1}`,
    'Confirmed destination cellar ID': String(index + 1),
    Operator: 'operator-1',
    Reviewer: 'reviewer-1',
    'Reviewed at (UTC)': '2026-08-06T10:00:00Z'
  }))

  const report = auditImportData({
    producers: [{ __row: 2, id: '9', producer_name: 'Brewery' }],
    products: [{ __row: 2, id: '20', product_name: 'Beer', producer_id: '9' }],
    bonusDecisions,
    cellarIdentity
  })

  assert.equal(report.status, 'PASS')
  assert.equal(report.counts.bonusDecisions, 10)
  assert.equal(report.counts.cellarIdentity, 399)
})

test('preflight blocks incomplete bonus and cellar evidence ledgers', () => {
  const report = auditImportData({
    producers: [{ __row: 2, id: '9', producer_name: 'Brewery' }],
    products: [{ __row: 2, id: '20', product_name: 'Beer', producer_id: '9' }],
    bonusDecisions: [{
      __row: 2,
      'Source variant': '',
      'Source count': '68',
      Decision: 'accepted',
      'Canonical bonus ID': '',
      'Rejection reason': '',
      'Evidence reference': 'PRIVATE-BONUS-1',
      Operator: 'operator-1',
      Reviewer: 'reviewer-1',
      'Reviewed at (UTC)': '2026-08-06T10:00:00Z'
    }],
    cellarIdentity: [{
      __row: 2,
      'Source record key': 'source-1',
      'Verified owner ID': '',
      'Verification method': '',
      'Evidence reference': '',
      'Confirmed destination cellar ID': 'not-an-id',
      Operator: 'operator-1',
      Reviewer: 'reviewer-1',
      'Reviewed at (UTC)': '2026-08-06T10:00:00Z'
    }]
  })

  assert.equal(report.status, 'BLOCKED')
  assert.deepEqual(report.countsByCode, {
    BONUS_DECISION_MISSING_VARIANT: 1,
    BONUS_DECISION_SOURCE_TOTAL_MISMATCH: 1,
    BONUS_DECISION_MISSING_CANONICAL_ID: 1,
    BONUS_DECISION_VARIANT_COUNT_MISMATCH: 1,
    CELLAR_IDENTITY_MISSING_OWNER: 1,
    CELLAR_IDENTITY_MISSING_METHOD: 1,
    CELLAR_IDENTITY_MISSING_EVIDENCE: 1,
    CELLAR_IDENTITY_INVALID_DESTINATION_ID: 1,
    CELLAR_IDENTITY_ROW_COUNT_MISMATCH: 1,
    EVIDENCE_REFERENCE_MISSING: 1
  })
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

test('preflight blocks a blank producer reference', () => {
  const report = auditImportData({
    producers: [{ __row: 2, id: '9', producer_name: 'Brewery' }],
    products: [{ __row: 2, id: '20', product_name: 'Beer', producer_id: '   ' }]
  })

  assert.equal(report.status, 'BLOCKED')
  assert.deepEqual(report.blockers, [{
    code: 'MISSING_PRODUCER_REFERENCE',
    collection: 'products',
    row: 2,
    recordId: '20',
    value: ''
  }])
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

test('CSV fingerprints report byte length and a stable SHA-256 digest', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-import-audit-'))
  const filePath = path.join(directory, 'products.csv')
  fs.writeFileSync(filePath, 'id,product_name,producer_id\n20,Beer,9\n')

  try {
    assert.deepEqual(fingerprintCsv(filePath), {
      bytes: 38,
      sha256: 'b365ac75ba7f7b2ee48db63a756c4c00508782e9ea64f0c4f638ff6810e12933'
    })
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})