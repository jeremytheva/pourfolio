import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { auditImportData, parseCsv } from '../audit-import-references.js'
import {
  auditReferenceDecisionLedger,
  auditReferenceRemediation,
  buildReferenceRemediationTasks,
  REFERENCE_REMEDIATION_PLAN_ID,
  renderReferenceDecisionTemplate
} from '../audit-reference-remediation.js'

const sourceFixture = () => ({
  producers: [{ __row: 2, id: '9', producer_name: 'Canonical brewery' }],
  products: [
    { __row: 2, id: '20', product_name: 'Producer missing', producer_id: '0' },
    { __row: 3, id: '21', product_name: 'Canonical beer', producer_id: '9' }
  ],
  ratings: [
    {
      __row: 2,
      rating_id: '500',
      current_product_id: '351',
      product_name_final: '=SUM(1,2)',
      producer_name_final: 'Historical brewery',
      user_id: 'private-user-1',
      rater_name_resolved: 'Private rater'
    },
    {
      __row: 3,
      rating_id: '501',
      current_product_id: '351',
      product_name_final: '=SUM(1,2)',
      producer_name_final: 'Historical brewery',
      user_id: 'private-user-2'
    }
  ],
  cellar: [
    { __row: 2, id: '700', product_id: '351', user_id: 'private-owner-1' },
    { __row: 3, id: '701', product_id: '357', user_id: 'private-owner-2' }
  ]
})

const completedDecision = (task, row) => {
  const isProducerTask = task['Issue code'] === 'MISSING_PRODUCER_REFERENCE'
  const isRejected = task['Source reference ID'] === '357'
  return {
    __row: row,
    ...task,
    Decision: isRejected ? 'rejected' : 'mapped',
    'Canonical ID': isRejected ? '' : isProducerTask ? '9' : '21',
    'Rejection reason': isRejected ? 'Quarantine: no same-state catalogue evidence' : '',
    'Evidence reference': `PRIVATE-REF-${row}`,
    Operator: 'operator-1',
    Reviewer: 'reviewer-1',
    'Reviewed at (UTC)': '2026-08-15T01:00:00Z'
  }
}

test('reference tasks group repeated missing product IDs and exclude private identity fields', () => {
  const source = sourceFixture()
  const { sourceAudit, tasks } = buildReferenceRemediationTasks(source)

  assert.equal(sourceAudit.status, 'BLOCKED')
  assert.equal(sourceAudit.counts.blockers, 5)
  assert.equal(tasks.length, 3)

  const productTask = tasks.find((task) => task['Source reference ID'] === '351')
  assert.deepEqual(productTask, {
    'Task key': 'MISSING_PRODUCT_REFERENCE:product:351',
    'Issue code': 'MISSING_PRODUCT_REFERENCE',
    'Source collections': 'cellar; ratings',
    'Source rows': 'cellar:2; ratings:2; ratings:3',
    'Source record IDs': 'cellar:700; ratings:500; ratings:501',
    'Source reference ID': '351',
    'Product name': "'=SUM(1,2)",
    'Producer name': 'Historical brewery',
    'Occurrence count': '3'
  })

  const rendered = renderReferenceDecisionTemplate(tasks)
  assert.doesNotMatch(rendered, /private-user|private-owner|Private rater|user_id|rater_name/)
  assert.match(rendered, /'=SUM\(1,2\)/)
  assert.equal(parseCsv(rendered).length, 3)
})

test('reference templates neutralise formula-like malformed source references', () => {
  const { tasks } = buildReferenceRemediationTasks({
    producers: [{ __row: 2, id: '9', producer_name: 'Canonical brewery' }],
    products: [{ __row: 2, id: '21', product_name: 'Canonical beer', producer_id: '9' }],
    ratings: [{
      __row: 2,
      rating_id: '500',
      current_product_id: '=WEBSERVICE("https://invalid.example")'
    }]
  })

  assert.equal(tasks.length, 1)
  assert.equal(tasks[0]['Source reference ID'], "'=WEBSERVICE(\"https://invalid.example\")")
  assert.doesNotMatch(renderReferenceDecisionTemplate(tasks), /,=WEBSERVICE/)
})

test('a complete independently reviewed ledger passes only the decision scope', () => {
  const source = sourceFixture()
  const { tasks } = buildReferenceRemediationTasks(source)
  const decisions = tasks.map((task, index) => completedDecision(task, index + 2))
  const report = auditReferenceRemediation({ ...source, decisions })

  assert.equal(report.planId, REFERENCE_REMEDIATION_PLAN_ID)
  assert.equal(report.certificationScope, 'reference-decision-ledger-only')
  assert.equal(report.status, 'PASS')
  assert.equal(report.sourceImportStatus, 'BLOCKED')
  assert.deepEqual(report.counts, {
    sourceReferenceOccurrences: 5,
    remediationTasks: 3,
    decisionRows: 3,
    mappedDecisions: 2,
    rejectedDecisions: 1,
    blockers: 0
  })
  assert.equal(auditImportData(source).status, 'BLOCKED')
})

test('decision validation rejects catalogue, provenance, review and rejection defects', () => {
  const source = sourceFixture()
  const { tasks } = buildReferenceRemediationTasks(source)
  const decisions = tasks.map((task, index) => completedDecision(task, index + 2))
  const producerDecision = decisions.find((record) => record['Issue code'] === 'MISSING_PRODUCER_REFERENCE')
  const mappedProductDecision = decisions.find((record) => record['Source reference ID'] === '351')
  const rejectedProductDecision = decisions.find((record) => record['Source reference ID'] === '357')

  producerDecision['Canonical ID'] = '999'
  mappedProductDecision.Reviewer = 'OPERATOR-1'
  mappedProductDecision['Reviewed at (UTC)'] = '2026-08-15T11:00:00+10:00'
  rejectedProductDecision['Canonical ID'] = '21'
  rejectedProductDecision['Rejection reason'] = ''
  rejectedProductDecision['Evidence reference'] = ''
  rejectedProductDecision['Occurrence count'] = '99'

  const blockers = auditReferenceDecisionLedger({
    tasks,
    decisions,
    products: source.products,
    producers: source.producers
  })
  const codes = blockers.map((blocker) => blocker.code)

  assert.ok(codes.includes('REFERENCE_DECISION_CANONICAL_ID_UNKNOWN'))
  assert.ok(codes.includes('REFERENCE_DECISION_REVIEWER_NOT_INDEPENDENT'))
  assert.ok(codes.includes('REFERENCE_DECISION_REVIEWED_AT_INVALID'))
  assert.ok(codes.includes('REFERENCE_DECISION_REJECTED_WITH_CANONICAL_ID'))
  assert.ok(codes.includes('REFERENCE_DECISION_REJECTION_REASON_MISSING'))
  assert.ok(codes.includes('REFERENCE_DECISION_EVIDENCE_MISSING'))
  assert.ok(codes.includes('REFERENCE_DECISION_TASK_MISMATCH'))
})

test('decision validation rejects duplicate, unknown and omitted tasks', () => {
  const source = sourceFixture()
  const { tasks } = buildReferenceRemediationTasks(source)
  const first = completedDecision(tasks[0], 2)
  const decisions = [
    first,
    { ...first, __row: 3 },
    { ...first, __row: 4, 'Task key': 'MISSING_PRODUCT_REFERENCE:product:999' }
  ]
  const blockers = auditReferenceDecisionLedger({
    tasks,
    decisions,
    products: source.products,
    producers: source.producers
  })

  assert.deepEqual(
    blockers.reduce((counts, blocker) => {
      counts[blocker.code] = (counts[blocker.code] || 0) + 1
      return counts
    }, {}),
    {
      REFERENCE_DECISION_DUPLICATE_TASK: 1,
      REFERENCE_DECISION_UNKNOWN_TASK: 1,
      REFERENCE_DECISION_MISSING_TASK: 2
    }
  )
})

test('reference remediation CLI writes reproducible template and report fingerprints', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-reference-remediation-'))
  const productsPath = path.join(directory, 'products.csv')
  const producersPath = path.join(directory, 'producers.csv')
  const ratingsPath = path.join(directory, 'ratings.csv')
  const templatePath = path.join(directory, 'reference-decisions.csv')
  const reportPath = path.join(directory, 'reference-report.json')
  const scriptPath = path.resolve('scripts/audit-reference-remediation.js')

  fs.writeFileSync(productsPath, 'id,product_name,producer_id\n20,Missing producer,0\n21,Canonical beer,9\n')
  fs.writeFileSync(producersPath, 'id,producer_name\n9,Canonical brewery\n')
  fs.writeFileSync(ratingsPath, 'rating_id,current_product_id,product_name_final\n500,351,Historical beer\n')

  try {
    const arguments_ = [
      scriptPath,
      '--products', productsPath,
      '--producers', producersPath,
      '--ratings', ratingsPath,
      '--template', templatePath,
      '--output', reportPath
    ]
    const firstRun = spawnSync(process.execPath, arguments_, { encoding: 'utf8' })
    const firstTemplate = fs.readFileSync(templatePath, 'utf8')
    const firstReport = fs.readFileSync(reportPath, 'utf8')
    const secondRun = spawnSync(process.execPath, arguments_, { encoding: 'utf8' })

    assert.equal(firstRun.status, 1)
    assert.equal(firstRun.stderr, '')
    assert.equal(secondRun.status, 1)
    assert.equal(secondRun.stderr, '')
    assert.equal(fs.readFileSync(templatePath, 'utf8'), firstTemplate)
    assert.equal(fs.readFileSync(reportPath, 'utf8'), firstReport)

    const report = JSON.parse(firstReport)
    assert.equal(report.status, 'BLOCKED')
    assert.equal(report.counts.remediationTasks, 2)
    assert.equal(report.countsByCode.REFERENCE_DECISION_MISSING_TASK, 2)
    assert.equal(report.inputs.products.file, 'products.csv')
    assert.equal(report.template.file, 'reference-decisions.csv')
    assert.match(report.template.sha256, /^[a-f0-9]{64}$/)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})