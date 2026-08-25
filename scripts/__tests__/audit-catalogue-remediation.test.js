import assert from 'node:assert/strict'
import test from 'node:test'
import {
  auditCatalogueDecisionLedger,
  buildCatalogueRemediationTasks,
  CATALOGUE_LEDGER_FIELDS,
  renderCatalogueRemediationTemplate
} from '../audit-catalogue-remediation.js'

const row = (values, number = 2) => ({ __row: number, user_id: '', ...values })

const valid = () => ({
  producers: [row({ id: '10', producer_name: 'Brewery' })],
  categories: [
    row({ id: '1', category_name: 'Beverage', parent_id: '' }),
    row({ id: '2', category_name: 'Beer', parent_id: '1' }, 3)
  ],
  products: [
    row({ id: '100', product_name: 'Pale Ale', producer_id: '10', product_category_id: '2', abv: '5.2', ibu: '30', collaboration: 'false' })
  ]
})

const decisionFor = (task, overrides = {}) => ({
  __row: 2,
  ...Object.fromEntries(CATALOGUE_LEDGER_FIELDS.map((field) => [field, task[field] || ''])),
  Decision: 'accept',
  'Canonical ID': '',
  'Replacement value': '',
  'Rejection reason': '',
  'Evidence reference': 'evidence://catalogue-review/1',
  Operator: 'operator@example.test',
  Reviewer: 'reviewer@example.test',
  'Reviewed at (UTC)': '2026-08-25T04:30:00Z',
  ...overrides
})

test('valid catalogue produces no remediation tasks', () => {
  const input = valid()
  const result = buildCatalogueRemediationTasks({ ...input, rootCategoryId: '1' })
  assert.equal(result.sourceAudit.status, 'PASS')
  assert.deepEqual(result.tasks, [])
  assert.equal(renderCatalogueRemediationTemplate(result.tasks).split('\n')[0], CATALOGUE_LEDGER_FIELDS.join(','))
})

test('duplicate browse sort blockers collapse into one decision task', () => {
  const input = valid()
  input.products.push(row({ id: '101', product_name: ' pale   ale ', producer_id: '10', product_category_id: '2', abv: '', ibu: '', collaboration: '0' }, 3))
  const { tasks } = buildCatalogueRemediationTasks({ ...input, rootCategoryId: '1' })
  const duplicateTasks = tasks.filter((task) => task['Issue code'] === 'DUPLICATE_PRODUCT_SORT_KEY')
  assert.equal(duplicateTasks.length, 1)
  assert.equal(duplicateTasks[0]['Occurrence count'], '2')
  assert.equal(duplicateTasks[0]['Related IDs'], 'product:100; product:101')
})

test('human-readable task names are spreadsheet safe', () => {
  const input = valid()
  input.products[0].product_name = '=1+1'
  input.products[0].producer_id = '99'
  const { tasks } = buildCatalogueRemediationTasks({ ...input, rootCategoryId: '1' })
  const task = tasks.find((item) => item['Issue code'] === 'MISSING_PRODUCER_REFERENCE')
  assert.equal(task['Product name'], "'=1+1")
  assert.equal(renderCatalogueRemediationTemplate([task]).includes("'=1+1"), true)
})

test('a reviewed producer remap can pass the decision-ledger audit without mutating source data', () => {
  const input = valid()
  input.products[0].producer_id = '99'
  const { tasks, sourceAudit } = buildCatalogueRemediationTasks({ ...input, rootCategoryId: '1' })
  assert.equal(sourceAudit.status, 'BLOCKED')
  assert.equal(tasks.length, 1)

  const decisions = [decisionFor(tasks[0], { Decision: 'remap', 'Canonical ID': '10' })]
  const result = auditCatalogueDecisionLedger({ tasks, decisions, producers: input.producers, categories: input.categories })
  assert.equal(result.status, 'PASS')
  assert.equal(input.products[0].producer_id, '99')
})

test('stale task provenance and non-independent review fail closed', () => {
  const input = valid()
  input.products[0].producer_id = '99'
  const { tasks } = buildCatalogueRemediationTasks({ ...input, rootCategoryId: '1' })
  const decisions = [decisionFor(tasks[0], {
    Decision: 'remap',
    'Canonical ID': '10',
    'Source rows': 'products:999',
    Reviewer: 'operator@example.test'
  })]
  const result = auditCatalogueDecisionLedger({ tasks, decisions, producers: input.producers, categories: input.categories })
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.countsByCode.CATALOGUE_DECISION_TASK_MISMATCH, 1)
  assert.equal(result.countsByCode.CATALOGUE_DECISION_REVIEWER_NOT_INDEPENDENT, 1)
})

test('unknown canonical IDs and deferred decisions keep the ledger blocked', () => {
  const input = valid()
  input.products[0].producer_id = '99'
  const { tasks } = buildCatalogueRemediationTasks({ ...input, rootCategoryId: '1' })

  const unknown = auditCatalogueDecisionLedger({
    tasks,
    decisions: [decisionFor(tasks[0], { Decision: 'remap', 'Canonical ID': '999' })],
    producers: input.producers,
    categories: input.categories
  })
  assert.equal(unknown.countsByCode.CATALOGUE_DECISION_CANONICAL_ID_UNKNOWN, 1)

  const deferred = auditCatalogueDecisionLedger({
    tasks,
    decisions: [decisionFor(tasks[0], { Decision: 'deferred' })],
    producers: input.producers,
    categories: input.categories
  })
  assert.equal(deferred.countsByCode.CATALOGUE_DECISION_DEFERRED, 1)
})
