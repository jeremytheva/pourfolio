import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCatalogueCandidate,
  renderCatalogueCandidateBundle
} from '../apply-catalogue-remediation.js'
import { buildCatalogueRemediationTasks } from '../audit-catalogue-remediation.js'

const ROOT = { id: '1', user_id: '', category_name: 'Beer', parent_id: '', __row: 2 }
const PRODUCER = { id: '1', user_id: '', producer_name: 'Brewery', __row: 2 }

const decisionRow = (task, {
  decision,
  canonicalId = '',
  replacementValue = '',
  rejectionReason = ''
}) => ({
  ...task,
  Decision: decision,
  'Canonical ID': canonicalId,
  'Replacement value': replacementValue,
  'Rejection reason': rejectionReason,
  'Evidence reference': 'evidence://review/1',
  Operator: 'operator-a',
  Reviewer: 'reviewer-b',
  'Reviewed at (UTC)': '2026-08-25T00:00:00Z',
  __row: 2
})

const tasksFor = (input) => buildCatalogueRemediationTasks(input).tasks

const baseProduct = (overrides = {}) => ({
  id: '1',
  user_id: '',
  product_name: 'Beer One',
  product_category_id: '1',
  producer_id: '1',
  abv: '5',
  ibu: '20',
  declared_category: '',
  edition: '',
  collaboration: 'false',
  __row: 2,
  ...overrides
})

test('applies reviewed remaps and produces a clean deterministic candidate', () => {
  const input = {
    products: [baseProduct({ producer_id: '99', product_category_id: '2' })],
    producers: [PRODUCER],
    categories: [
      ROOT,
      { id: '2', user_id: '', category_name: 'IPA', parent_id: '2', __row: 3 }
    ],
    rootCategoryId: '1'
  }
  const tasks = tasksFor(input)
  const decisions = tasks.map((task) => {
    if (task['Issue code'] === 'MISSING_PRODUCER_REFERENCE') return decisionRow(task, { decision: 'remap', canonicalId: '1' })
    if (task['Issue code'] === 'PRODUCT_CATEGORY_ANCESTRY_INVALID') return decisionRow(task, { decision: 'remap', canonicalId: '2' })
    if (['CATEGORY_CYCLE', 'CATEGORY_SELF_LINK'].includes(task['Issue code'])) return decisionRow(task, { decision: 'remap', canonicalId: '1' })
    throw new Error(`unexpected task ${task['Issue code']}`)
  })

  const result = buildCatalogueCandidate({ ...input, decisions })
  assert.equal(result.status, 'PASS')
  assert.equal(result.unapprovedResidualTasks.length, 0)
  assert.equal(result.candidate.products[0].producer_id, '1')
  assert.equal(result.candidate.categories[1].parent_id, '1')

  const fields = (record) => Object.keys(record).filter((key) => key !== '__row')
  const bundleA = renderCatalogueCandidateBundle({
    result,
    productFields: fields(input.products[0]),
    producerFields: fields(input.producers[0]),
    categoryFields: fields(input.categories[0])
  })
  const bundleB = renderCatalogueCandidateBundle({
    result,
    productFields: fields(input.products[0]),
    producerFields: fields(input.producers[0]),
    categoryFields: fields(input.categories[0])
  })
  assert.deepEqual(bundleA, bundleB)
  assert.match(bundleA.bundleSha256, /^[a-f0-9]{64}$/)
})

test('treats an independently accepted duplicate sort group as an explicit residual exception', () => {
  const input = {
    products: [
      baseProduct({ id: '1', product_name: 'Same Name', __row: 2 }),
      baseProduct({ id: '2', product_name: 'Same Name', __row: 3 })
    ],
    producers: [PRODUCER],
    categories: [ROOT],
    rootCategoryId: '1'
  }
  const tasks = tasksFor(input)
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0]['Issue code'], 'DUPLICATE_PRODUCT_SORT_KEY')

  const result = buildCatalogueCandidate({
    ...input,
    decisions: [decisionRow(tasks[0], { decision: 'accept' })]
  })
  assert.equal(result.status, 'PASS')
  assert.equal(result.approvedExceptions.length, 1)
  assert.equal(result.candidateAudit.status, 'BLOCKED')
  assert.equal(result.unapprovedResidualTasks.length, 0)
})

test('applies a deterministic public-text edit to one source record', () => {
  const input = {
    products: [baseProduct({ product_name: 'Beer Ã©' })],
    producers: [PRODUCER],
    categories: [ROOT],
    rootCategoryId: '1'
  }
  const [task] = tasksFor(input)
  assert.equal(task['Issue code'], 'PUBLIC_TEXT_ENCODING_SUSPECT')
  const result = buildCatalogueCandidate({
    ...input,
    decisions: [decisionRow(task, { decision: 'edit', replacementValue: 'Beer é' })]
  })
  assert.equal(result.status, 'PASS')
  assert.equal(result.candidate.products[0].product_name, 'Beer é')
})

test('removes only one explicitly reviewed source record', () => {
  const input = {
    products: [baseProduct({ producer_id: '99' })],
    producers: [PRODUCER],
    categories: [ROOT],
    rootCategoryId: '1'
  }
  const [task] = tasksFor(input)
  const result = buildCatalogueCandidate({
    ...input,
    decisions: [decisionRow(task, { decision: 'remove', rejectionReason: 'Invalid source row' })]
  })
  assert.equal(result.status, 'PASS')
  assert.equal(result.candidate.products.length, 0)
})

test('refuses application when the governed decision ledger is incomplete', () => {
  const input = {
    products: [baseProduct({ producer_id: '99' })],
    producers: [PRODUCER],
    categories: [ROOT],
    rootCategoryId: '1'
  }
  assert.throws(
    () => buildCatalogueCandidate({ ...input, decisions: [] }),
    (error) => error.code === 'CATALOGUE_REMEDIATION_LEDGER_BLOCKED'
  )
})

test('fails closed when a grouped duplicate task requests an ambiguous edit', () => {
  const input = {
    products: [
      baseProduct({ id: '1', product_name: 'Same Name', __row: 2 }),
      baseProduct({ id: '2', product_name: 'Same Name', __row: 3 })
    ],
    producers: [PRODUCER],
    categories: [ROOT],
    rootCategoryId: '1'
  }
  const [task] = tasksFor(input)
  assert.throws(
    () => buildCatalogueCandidate({
      ...input,
      decisions: [decisionRow(task, { decision: 'edit', replacementValue: 'Different Name' })]
    }),
    /edit requires exactly one source record/
  )
})

test('keeps unapproved residual blockers visible even when a ledger decision is formally valid', () => {
  const input = {
    products: [baseProduct({ producer_id: '99' })],
    producers: [PRODUCER],
    categories: [ROOT],
    rootCategoryId: '1'
  }
  const [task] = tasksFor(input)
  const result = buildCatalogueCandidate({
    ...input,
    decisions: [decisionRow(task, { decision: 'accept' })]
  })
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.unapprovedResidualTasks.length, 1)
  assert.equal(result.unapprovedResidualTasks[0].issueCode, 'MISSING_PRODUCER_REFERENCE')
})
