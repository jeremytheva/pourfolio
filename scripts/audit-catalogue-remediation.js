import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { auditCatalogue } from './audit-catalogue-source.js'
import { parseCsv } from './audit-import-references.js'

const POSITIVE_INTEGER = /^[1-9]\d*$/
const UTC_TIMESTAMP = /(?:Z|\+00:00)$/i

export const CATALOGUE_REMEDIATION_PLAN_ID = 'PF-P3-CATALOGUE-REMEDIATION-V1'

export const CATALOGUE_TASK_FIELDS = [
  'Task key',
  'Issue code',
  'Source collections',
  'Source rows',
  'Source record IDs',
  'Affected field',
  'Related IDs',
  'Product name',
  'Producer name',
  'Category name',
  'Occurrence count'
]

export const CATALOGUE_DECISION_FIELDS = [
  'Decision',
  'Canonical ID',
  'Replacement value',
  'Rejection reason',
  'Evidence reference',
  'Operator',
  'Reviewer',
  'Reviewed at (UTC)'
]

export const CATALOGUE_LEDGER_FIELDS = [
  ...CATALOGUE_TASK_FIELDS,
  ...CATALOGUE_DECISION_FIELDS
]

const textValue = (value) => String(value ?? '').trim()
const naturalCompare = (left, right) => left.localeCompare(right, 'en', { numeric: true })
const sortedValues = (values) => [...values].sort(naturalCompare)
const joinValues = (values) => sortedValues(values).join('; ')
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

const neutraliseSpreadsheetFormula = (value) => {
  const text = textValue(value)
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

const normaliseSortKey = (value) => textValue(value)
  .normalize('NFKC')
  .toLocaleLowerCase('en-AU')
  .replace(/\s+/g, ' ')

const nameFieldForCollection = (collection) => (
  collection === 'products' ? 'product_name' : collection === 'producers' ? 'producer_name' : 'category_name'
)

const recordIndex = (records) => new Map(records.map((record) => [record.__row, record]))

const sourceRecordId = (record) => textValue(record?.id)

const duplicateSortGroupByRow = (products) => {
  const groups = new Map()
  for (const product of products) {
    const key = normaliseSortKey(product.product_name)
    if (!key) continue
    const group = groups.get(key) || []
    group.push(product)
    groups.set(key, group)
  }

  const byRow = new Map()
  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue
    const groupKey = sha256(key).slice(0, 16)
    const ids = group.map((record) => sourceRecordId(record)).filter(Boolean)
    for (const record of group) byRow.set(record.__row, { groupKey, ids })
  }
  return byRow
}

const taskKeyForBlocker = (blocker, duplicateGroups) => {
  if (blocker.code === 'DUPLICATE_PRODUCT_SORT_KEY') {
    const group = duplicateGroups.get(blocker.row)
    return `DUPLICATE_PRODUCT_SORT_KEY:group:${group?.groupKey || `row-${blocker.row}`}`
  }

  const recordId = textValue(blocker.recordId)
  const field = textValue(blocker.field)
  if (recordId) return `${blocker.code}:${blocker.collection}:${recordId}${field ? `:${field}` : ''}`
  return `${blocker.code}:${blocker.collection}:row-${blocker.row || 0}${field ? `:${field}` : ''}`
}

const addTaskOccurrence = (tasks, blocker, record, duplicateGroups) => {
  const taskKey = taskKeyForBlocker(blocker, duplicateGroups)
  const task = tasks.get(taskKey) || {
    taskKey,
    issueCode: blocker.code,
    collections: new Set(),
    rows: new Set(),
    recordIds: new Set(),
    fields: new Set(),
    relatedIds: new Set(),
    productNames: new Set(),
    producerNames: new Set(),
    categoryNames: new Set(),
    occurrenceCount: 0
  }

  task.collections.add(blocker.collection)
  if (blocker.row) task.rows.add(`${blocker.collection}:${blocker.row}`)
  if (blocker.recordId) task.recordIds.add(`${blocker.collection}:${blocker.recordId}`)
  if (blocker.field) task.fields.add(blocker.field)
  if (blocker.categoryId) task.relatedIds.add(`category:${blocker.categoryId}`)

  if (blocker.code === 'DUPLICATE_PRODUCT_SORT_KEY') {
    const group = duplicateGroups.get(blocker.row)
    for (const id of group?.ids || []) task.relatedIds.add(`product:${id}`)
  }

  if (record) {
    if (blocker.collection === 'products') task.productNames.add(neutraliseSpreadsheetFormula(record.product_name))
    if (blocker.collection === 'producers') task.producerNames.add(neutraliseSpreadsheetFormula(record.producer_name))
    if (blocker.collection === 'categories') task.categoryNames.add(neutraliseSpreadsheetFormula(record.category_name))
  }

  task.occurrenceCount += 1
  tasks.set(taskKey, task)
}

const finaliseTask = (task) => ({
  'Task key': task.taskKey,
  'Issue code': task.issueCode,
  'Source collections': joinValues(task.collections),
  'Source rows': joinValues(task.rows),
  'Source record IDs': joinValues(task.recordIds),
  'Affected field': joinValues(task.fields),
  'Related IDs': joinValues(task.relatedIds),
  'Product name': joinValues(task.productNames),
  'Producer name': joinValues(task.producerNames),
  'Category name': joinValues(task.categoryNames),
  'Occurrence count': String(task.occurrenceCount)
})

export const buildCatalogueRemediationTasks = ({ products, producers, categories, rootCategoryId }) => {
  const sourceAudit = auditCatalogue({ products, producers, categories, rootCategoryId })
  const recordsByCollection = {
    products: recordIndex(products),
    producers: recordIndex(producers),
    categories: recordIndex(categories)
  }
  const duplicateGroups = duplicateSortGroupByRow(products)
  const tasks = new Map()

  for (const blocker of sourceAudit.blockers) {
    const record = recordsByCollection[blocker.collection]?.get(blocker.row)
    addTaskOccurrence(tasks, blocker, record, duplicateGroups)
  }

  return {
    sourceAudit,
    tasks: [...tasks.values()]
      .map(finaliseTask)
      .sort((left, right) => naturalCompare(left['Task key'], right['Task key']))
  }
}

const positiveIds = (records) => new Set(records
  .map((record) => textValue(record.id))
  .filter((id) => POSITIVE_INTEGER.test(id)))

const requireLedgerColumns = (records) => {
  if (!records.length) return
  const available = new Set(Object.keys(records[0]).filter((key) => key !== '__row'))
  const missing = CATALOGUE_LEDGER_FIELDS.filter((field) => !available.has(field))
  if (missing.length) throw new Error(`Catalogue remediation ledger is missing required column(s): ${missing.join(', ')}.`)
}

const checkTaskProvenance = (record, task, blockers) => {
  const changed = CATALOGUE_TASK_FIELDS.filter((field) => textValue(record[field]) !== textValue(task[field]))
  if (changed.length) blockers.push({ code: 'CATALOGUE_DECISION_TASK_MISMATCH', taskKey: task['Task key'], row: record.__row, fields: changed })
}

const checkReviewEvidence = (record, taskKey, blockers) => {
  const evidence = textValue(record['Evidence reference'])
  const operator = textValue(record.Operator)
  const reviewer = textValue(record.Reviewer)
  const reviewedAt = textValue(record['Reviewed at (UTC)'])

  if (!evidence) blockers.push({ code: 'CATALOGUE_DECISION_EVIDENCE_MISSING', taskKey, row: record.__row })
  if (!operator) blockers.push({ code: 'CATALOGUE_DECISION_OPERATOR_MISSING', taskKey, row: record.__row })
  if (!reviewer) blockers.push({ code: 'CATALOGUE_DECISION_REVIEWER_MISSING', taskKey, row: record.__row })
  if (operator && reviewer && operator.toLowerCase() === reviewer.toLowerCase()) {
    blockers.push({ code: 'CATALOGUE_DECISION_REVIEWER_NOT_INDEPENDENT', taskKey, row: record.__row })
  }
  if (!UTC_TIMESTAMP.test(reviewedAt) || Number.isNaN(Date.parse(reviewedAt))) {
    blockers.push({ code: 'CATALOGUE_DECISION_REVIEWED_AT_INVALID', taskKey, row: record.__row })
  }
}

const canonicalTargetForTask = (task) => {
  const code = task['Issue code']
  if (code === 'MISSING_PRODUCER_REFERENCE') return 'producer'
  if (['MISSING_CATEGORY_REFERENCE', 'PRODUCT_CATEGORY_ANCESTRY_INVALID', 'CATEGORY_PARENT_MISSING', 'CATEGORY_SELF_LINK', 'CATEGORY_CYCLE'].includes(code)) return 'category'
  return null
}

const checkDecision = (record, task, producerIds, categoryIds, blockers) => {
  const taskKey = task['Task key']
  const decision = textValue(record.Decision).toLowerCase()
  const canonicalId = textValue(record['Canonical ID'])
  const replacementValue = textValue(record['Replacement value'])
  const rejectionReason = textValue(record['Rejection reason'])
  const allowed = new Set(['remap', 'edit', 'remove', 'accept', 'deferred'])

  if (!allowed.has(decision)) {
    blockers.push({ code: 'CATALOGUE_DECISION_INVALID_DECISION', taskKey, row: record.__row })
    return
  }

  if (decision === 'deferred') {
    blockers.push({ code: 'CATALOGUE_DECISION_DEFERRED', taskKey, row: record.__row })
    return
  }

  checkReviewEvidence(record, taskKey, blockers)

  if (decision === 'remap') {
    const target = canonicalTargetForTask(task)
    const validIds = target === 'producer' ? producerIds : target === 'category' ? categoryIds : null
    if (!validIds) blockers.push({ code: 'CATALOGUE_DECISION_REMAP_NOT_APPLICABLE', taskKey, row: record.__row })
    else if (!POSITIVE_INTEGER.test(canonicalId)) blockers.push({ code: 'CATALOGUE_DECISION_CANONICAL_ID_MISSING', taskKey, row: record.__row })
    else if (!validIds.has(canonicalId)) blockers.push({ code: 'CATALOGUE_DECISION_CANONICAL_ID_UNKNOWN', taskKey, row: record.__row })
    if (replacementValue) blockers.push({ code: 'CATALOGUE_DECISION_REMAP_WITH_REPLACEMENT_VALUE', taskKey, row: record.__row })
    if (rejectionReason) blockers.push({ code: 'CATALOGUE_DECISION_REMAP_WITH_REJECTION_REASON', taskKey, row: record.__row })
  }

  if (decision === 'edit') {
    if (!replacementValue) blockers.push({ code: 'CATALOGUE_DECISION_REPLACEMENT_VALUE_MISSING', taskKey, row: record.__row })
    if (canonicalId) blockers.push({ code: 'CATALOGUE_DECISION_EDIT_WITH_CANONICAL_ID', taskKey, row: record.__row })
    if (rejectionReason) blockers.push({ code: 'CATALOGUE_DECISION_EDIT_WITH_REJECTION_REASON', taskKey, row: record.__row })
  }

  if (decision === 'remove') {
    if (!rejectionReason) blockers.push({ code: 'CATALOGUE_DECISION_REJECTION_REASON_MISSING', taskKey, row: record.__row })
    if (canonicalId) blockers.push({ code: 'CATALOGUE_DECISION_REMOVE_WITH_CANONICAL_ID', taskKey, row: record.__row })
    if (replacementValue) blockers.push({ code: 'CATALOGUE_DECISION_REMOVE_WITH_REPLACEMENT_VALUE', taskKey, row: record.__row })
  }

  if (decision === 'accept') {
    if (canonicalId || replacementValue || rejectionReason) blockers.push({ code: 'CATALOGUE_DECISION_ACCEPT_HAS_MUTATION_FIELDS', taskKey, row: record.__row })
  }
}

export const auditCatalogueDecisionLedger = ({ tasks, decisions = [], producers, categories }) => {
  requireLedgerColumns(decisions)
  const blockers = []
  const tasksByKey = new Map(tasks.map((task) => [task['Task key'], task]))
  const decisionsByKey = new Map()
  const producerIds = positiveIds(producers)
  const categoryIds = positiveIds(categories)

  for (const decision of decisions) {
    const taskKey = textValue(decision['Task key'])
    if (!taskKey || !tasksByKey.has(taskKey)) {
      blockers.push({ code: 'CATALOGUE_DECISION_UNKNOWN_TASK', taskKey: taskKey || null, row: decision.__row })
      continue
    }
    if (decisionsByKey.has(taskKey)) {
      blockers.push({ code: 'CATALOGUE_DECISION_DUPLICATE_TASK', taskKey, row: decision.__row })
      continue
    }
    decisionsByKey.set(taskKey, decision)
    const task = tasksByKey.get(taskKey)
    checkTaskProvenance(decision, task, blockers)
    checkDecision(decision, task, producerIds, categoryIds, blockers)
  }

  for (const task of tasks) {
    if (!decisionsByKey.has(task['Task key'])) blockers.push({ code: 'CATALOGUE_DECISION_MISSING', taskKey: task['Task key'] })
  }

  blockers.sort((left, right) => naturalCompare(left.code, right.code) || naturalCompare(String(left.taskKey || ''), String(right.taskKey || '')) || (left.row || 0) - (right.row || 0))
  const countsByCode = {}
  for (const blocker of blockers) countsByCode[blocker.code] = (countsByCode[blocker.code] || 0) + 1

  return {
    schema: 'pourfolio.catalogue-remediation-decision-audit.v1',
    planId: CATALOGUE_REMEDIATION_PLAN_ID,
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: { tasks: tasks.length, decisions: decisions.length, blockers: blockers.length },
    countsByCode,
    blockers
  }
}

const escapeCsv = (value) => {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const renderCatalogueRemediationTemplate = (tasks) => {
  const lines = [CATALOGUE_LEDGER_FIELDS.map(escapeCsv).join(',')]
  for (const task of tasks) {
    const row = Object.fromEntries(CATALOGUE_LEDGER_FIELDS.map((field) => [field, task[field] || '']))
    lines.push(CATALOGUE_LEDGER_FIELDS.map((field) => escapeCsv(row[field])).join(','))
  }
  return `${lines.join('\n')}\n`
}

const parseArguments = (args) => {
  const allowed = new Set(['products', 'producers', 'categories', 'root-category-id', 'ledger', 'template', 'output'])
  const options = {}
  for (let i = 0; i < args.length; i += 2) {
    const raw = args[i]
    const value = args[i + 1]
    const name = raw?.startsWith('--') ? raw.slice(2) : ''
    if (!allowed.has(name) || !value || options[name]) throw new Error('Arguments must use unique --name value pairs.')
    options[name] = value
  }
  for (const required of ['products', 'producers', 'categories', 'root-category-id']) if (!options[required]) throw new Error(`--${required} is required.`)
  if (!options.template && !options.ledger) throw new Error('At least one of --template or --ledger is required.')
  return options
}

const loadCsv = (filePath) => parseCsv(fs.readFileSync(path.resolve(filePath), 'utf8'))

export const runCli = (args) => {
  const options = parseArguments(args)
  const products = loadCsv(options.products)
  const producers = loadCsv(options.producers)
  const categories = loadCsv(options.categories)
  const { sourceAudit, tasks } = buildCatalogueRemediationTasks({ products, producers, categories, rootCategoryId: options['root-category-id'] })

  if (options.template) fs.writeFileSync(path.resolve(options.template), renderCatalogueRemediationTemplate(tasks))

  const report = options.ledger
    ? auditCatalogueDecisionLedger({ tasks, decisions: loadCsv(options.ledger), producers, categories })
    : {
        schema: 'pourfolio.catalogue-remediation-decision-audit.v1',
        planId: CATALOGUE_REMEDIATION_PLAN_ID,
        status: 'BLOCKED',
        counts: { tasks: tasks.length, decisions: 0, blockers: tasks.length },
        countsByCode: { CATALOGUE_DECISION_MISSING: tasks.length },
        blockers: tasks.map((task) => ({ code: 'CATALOGUE_DECISION_MISSING', taskKey: task['Task key'] }))
      }

  const rendered = `${JSON.stringify({ sourceStatus: sourceAudit.status, sourceBlockers: sourceAudit.counts.blockers, ...report }, null, 2)}\n`
  if (options.output) fs.writeFileSync(path.resolve(options.output), rendered)
  process.stdout.write(rendered)
  return report.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = runCli(process.argv.slice(2)) } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2 }
}
