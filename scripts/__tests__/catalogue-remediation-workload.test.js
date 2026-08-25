import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseCsv } from '../audit-import-references.js'

const ledgerPath = new URL('../../exports/catalogue-remediation-ledger.csv', import.meta.url)
const summaryPath = new URL('../../exports/catalogue-remediation-workload.json', import.meta.url)

const decisionFields = [
  'Decision',
  'Canonical ID',
  'Replacement value',
  'Rejection reason',
  'Evidence reference',
  'Operator',
  'Reviewer',
  'Reviewed at (UTC)'
]

const expectedTaskCounts = {
  CATEGORY_CYCLE: 22,
  CATEGORY_SELF_LINK: 1,
  DUPLICATE_PRODUCT_SORT_KEY: 9,
  MISSING_CATEGORY_REFERENCE: 4,
  MISSING_PRODUCER_REFERENCE: 29,
  PRODUCT_CATEGORY_ANCESTRY_INVALID: 127,
  PUBLIC_TEXT_ENCODING_SUSPECT: 1
}

const expectedOccurrenceCounts = {
  ...expectedTaskCounts,
  DUPLICATE_PRODUCT_SORT_KEY: 25
}

test('materialised catalogue remediation workload reconciles to the exact blocked audit', () => {
  const ledger = parseCsv(fs.readFileSync(ledgerPath, 'utf8'))
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))

  assert.equal(ledger.length, 193)
  assert.equal(summary.schema, 'pourfolio.catalogue-remediation-workload.v1')
  assert.equal(summary.sourceAudit.status, 'BLOCKED')
  assert.equal(summary.sourceAudit.rootCategoryId, '1')
  assert.equal(summary.sourceAudit.blockerOccurrences, 209)
  assert.equal(summary.sourceAudit.bundleSha256, '23343915eced1e4cac15b0b49f149cf808addd57d1697dab1e83b7063fb1bae2')
  assert.equal(summary.remediation.status, 'BLOCKED')
  assert.equal(summary.remediation.tasks, 193)
  assert.equal(summary.remediation.decisionsCompleted, 0)
  assert.equal(summary.remediation.decisionFieldsBlank, true)
  assert.deepEqual(summary.remediation.taskCountsByIssueCode, expectedTaskCounts)
  assert.deepEqual(summary.remediation.occurrenceCountsByIssueCode, expectedOccurrenceCounts)

  const taskCounts = {}
  const occurrenceCounts = {}
  for (const row of ledger) {
    taskCounts[row['Issue code']] = (taskCounts[row['Issue code']] || 0) + 1
    occurrenceCounts[row['Issue code']] = (occurrenceCounts[row['Issue code']] || 0) + Number(row['Occurrence count'])
    for (const field of decisionFields) assert.equal(row[field], '')
  }

  assert.deepEqual(taskCounts, expectedTaskCounts)
  assert.deepEqual(occurrenceCounts, expectedOccurrenceCounts)
  assert.equal(Object.values(occurrenceCounts).reduce((sum, count) => sum + count, 0), 209)
})
