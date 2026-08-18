import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { auditImportData, fingerprintCsv, parseCsv } from './audit-import-references.js'

const POSITIVE_INTEGER = /^[1-9]\d*$/
const UTC_TIMESTAMP = /(?:Z|\+00:00)$/i

export const REFERENCE_REMEDIATION_PLAN_ID = 'PF-P1-HISTORICAL-REFERENCE-REMEDIATION-V1'

export const REFERENCE_TASK_FIELDS = [
  'Task key',
  'Issue code',
  'Source collections',
  'Source rows',
  'Source record IDs',
  'Source reference ID',
  'Product name',
  'Producer name',
  'Occurrence count'
]

export const REFERENCE_DECISION_FIELDS = [
  'Decision',
  'Canonical ID',
  'Rejection reason',
  'Evidence reference',
  'Operator',
  'Reviewer',
  'Reviewed at (UTC)'
]

export const REFERENCE_LEDGER_FIELDS = [
  ...REFERENCE_TASK_FIELDS,
  ...REFERENCE_DECISION_FIELDS
]

const textValue = (value) => String(value ?? '').trim()

const neutraliseSpreadsheetFormula = (value) => {
  const text = textValue(value)
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

const naturalCompare = (left, right) => left.localeCompare(right, 'en', { numeric: true })

const sortedValues = (values) => [...values].sort(naturalCompare)

const joinValues = (values) => sortedValues(values).join('; ')

const firstValue = (record, fields) => {
  for (const field of fields) {
    const value = textValue(record?.[field])
    if (value) return value
  }
  return ''
}

const sourceRecordId = (record, collection) => {
  const fields = collection === 'ratings'
    ? ['rating_id', 'reserved_rating_id', 'source_id', 'id']
    : collection === 'cellar'
      ? ['id', 'confirmed_cellar_id', 'proposed_cellar_id', 'cellar_import_key', 'entry_no']
      : ['id']
  return firstValue(record, fields)
}

const productName = (record) => firstValue(record, ['product_name_final', 'product_name'])

const producerName = (record) => firstValue(record, ['producer_name_final', 'producer_name'])

const indexByRow = (records) => new Map(records.map((record) => [record.__row, record]))

const buildTaskKey = (blocker) => {
  if (blocker.code === 'MISSING_PRODUCER_REFERENCE') {
    const productId = textValue(blocker.recordId)
    return productId
      ? `${blocker.code}:product:${productId}`
      : `${blocker.code}:products:row-${blocker.row}`
  }

  const referenceId = textValue(blocker.value)
  return POSITIVE_INTEGER.test(referenceId)
    ? `${blocker.code}:product:${referenceId}`
    : `${blocker.code}:${blocker.collection}:row-${blocker.row}`
}

const addOccurrence = (tasks, blocker, record) => {
  const taskKey = buildTaskKey(blocker)
  const task = tasks.get(taskKey) || {
    taskKey,
    issueCode: blocker.code,
    sourceReferenceId: textValue(blocker.value),
    collections: new Set(),
    rows: new Set(),
    recordIds: new Set(),
    productNames: new Set(),
    producerNames: new Set(),
    occurrenceCount: 0
  }

  task.collections.add(blocker.collection)
  task.rows.add(`${blocker.collection}:${blocker.row}`)

  const recordId = sourceRecordId(record, blocker.collection)
  if (recordId) task.recordIds.add(`${blocker.collection}:${recordId}`)

  const sourceProductName = productName(record)
  if (sourceProductName) task.productNames.add(neutraliseSpreadsheetFormula(sourceProductName))

  const sourceProducerName = producerName(record)
  if (sourceProducerName) task.producerNames.add(neutraliseSpreadsheetFormula(sourceProducerName))

  task.occurrenceCount += 1
  tasks.set(taskKey, task)
}

const finaliseTask = (task) => ({
  'Task key': task.taskKey,
  'Issue code': task.issueCode,
  'Source collections': joinValues(task.collections),
  'Source rows': joinValues(task.rows),
  'Source record IDs': joinValues(task.recordIds),
  'Source reference ID': neutraliseSpreadsheetFormula(task.sourceReferenceId),
  'Product name': joinValues(task.productNames),
  'Producer name': joinValues(task.producerNames),
  'Occurrence count': String(task.occurrenceCount)
})

export const buildReferenceRemediationTasks = ({
  products,
  producers,
  ratings = [],
  cellar = []
}) => {
  const sourceAudit = auditImportData({ products, producers, ratings, cellar })
  const recordsByCollection = {
    products: indexByRow(products),
    ratings: indexByRow(ratings),
    cellar: indexByRow(cellar)
  }
  const tasks = new Map()

  for (const blocker of sourceAudit.blockers) {
    if (!['MISSING_PRODUCT_REFERENCE', 'MISSING_PRODUCER_REFERENCE'].includes(blocker.code)) continue
    const record = recordsByCollection[blocker.collection]?.get(blocker.row)
    addOccurrence(tasks, blocker, record)
  }

  return {
    sourceAudit,
    tasks: [...tasks.values()].map(finaliseTask).sort((left, right) => (
      naturalCompare(left['Task key'], right['Task key'])
    ))
  }
}

const requireDecisionColumns = (records) => {
  if (!records.length) return
  const available = new Set(Object.keys(records[0]).filter((key) => key !== '__row'))
  const missing = REFERENCE_LEDGER_FIELDS.filter((field) => !available.has(field))
  if (missing.length) {
    throw new Error(`Reference remediation ledger is missing required column(s): ${missing.join(', ')}.`)
  }
}

const positiveIds = (records) => new Set(
  records.map((record) => textValue(record.id)).filter((id) => POSITIVE_INTEGER.test(id))
)

const checkReviewEvidence = (record, taskKey, blockers) => {
  const evidence = textValue(record['Evidence reference'])
  const operator = textValue(record.Operator)
  const reviewer = textValue(record.Reviewer)
  const reviewedAt = textValue(record['Reviewed at (UTC)'])

  if (!evidence) blockers.push({ code: 'REFERENCE_DECISION_EVIDENCE_MISSING', taskKey, row: record.__row })
  if (!operator) blockers.push({ code: 'REFERENCE_DECISION_OPERATOR_MISSING', taskKey, row: record.__row })
  if (!reviewer) blockers.push({ code: 'REFERENCE_DECISION_REVIEWER_MISSING', taskKey, row: record.__row })
  if (operator && reviewer && operator.toLowerCase() === reviewer.toLowerCase()) {
    blockers.push({ code: 'REFERENCE_DECISION_REVIEWER_NOT_INDEPENDENT', taskKey, row: record.__row })
  }
  if (!UTC_TIMESTAMP.test(reviewedAt) || Number.isNaN(Date.parse(reviewedAt))) {
    blockers.push({
      code: 'REFERENCE_DECISION_REVIEWED_AT_INVALID',
      taskKey,
      row: record.__row,
      value: reviewedAt || null
    })
  }
}

const checkTaskProvenance = (record, task, blockers) => {
  const mismatchedFields = REFERENCE_TASK_FIELDS.filter((field) => (
    textValue(record[field]) !== textValue(task[field])
  ))
  if (mismatchedFields.length) {
    blockers.push({
      code: 'REFERENCE_DECISION_TASK_MISMATCH',
      taskKey: task['Task key'],
      row: record.__row,
      fields: mismatchedFields
    })
  }
}

const checkDecision = (record, task, productIds, producerIds, blockers) => {
  const taskKey = task['Task key']
  const decision = textValue(record.Decision).toLowerCase()
  const canonicalId = textValue(record['Canonical ID'])
  const rejectionReason = textValue(record['Rejection reason'])

  checkReviewEvidence(record, taskKey, blockers)

  if (decision === 'mapped') {
    const catalogueIds = task['Issue code'] === 'MISSING_PRODUCER_REFERENCE'
      ? producerIds
      : productIds
    if (!POSITIVE_INTEGER.test(canonicalId)) {
      blockers.push({
        code: 'REFERENCE_DECISION_CANONICAL_ID_MISSING',
        taskKey,
        row: record.__row,
        value: canonicalId || null
      })
    } else if (!catalogueIds.has(canonicalId)) {
      blockers.push({
        code: 'REFERENCE_DECISION_CANONICAL_ID_UNKNOWN',
        taskKey,
        row: record.__row,
        value: canonicalId
      })
    }
    if (rejectionReason) {
      blockers.push({ code: 'REFERENCE_DECISION_MAPPED_WITH_REJECTION_REASON', taskKey, row: record.__row })
    }
  } else if (decision === 'rejected') {
    if (!rejectionReason) {
      blockers.push({ code: 'REFERENCE_DECISION_REJECTION_REASON_MISSING', taskKey, row: record.__row })
    }
    if (canonicalId) {
      blockers.push({ code: 'REFERENCE_DECISION_REJECTED_WITH_CANONICAL_ID', taskKey, row: record.__row })
    }
  } else {
    blockers.push({
      code: 'REFERENCE_DECISION_INVALID_DECISION',
      taskKey,
      row: record.__row,
      value: record.Decision || null
    })
  }
}

export const auditReferenceDecisionLedger = ({ tasks, decisions = [], products, producers }) => {
  requireDecisionColumns(decisions)
  const blockers = []
  const tasksByKey = new Map(tasks.map((task) => [task['Task key'], task]))
  const decisionsByKey = new Map()
  const productIds = positiveIds(products)
  const producerIds = positiveIds(producers)

  for (const record of decisions) {
    const taskKey = textValue(record['Task key'])
    if (!taskKey) {
      blockers.push({ code: 'REFERENCE_DECISION_TASK_KEY_MISSING', row: record.__row })
      continue
    }
    if (decisionsByKey.has(taskKey)) {
      blockers.push({ code: 'REFERENCE_DECISION_DUPLICATE_TASK', taskKey, row: record.__row })
      continue
    }
    decisionsByKey.set(taskKey, record)

    const task = tasksByKey.get(taskKey)
    if (!task) {
      blockers.push({ code: 'REFERENCE_DECISION_UNKNOWN_TASK', taskKey, row: record.__row })
      continue
    }
    checkTaskProvenance(record, task, blockers)
    checkDecision(record, task, productIds, producerIds, blockers)
  }

  for (const task of tasks) {
    if (!decisionsByKey.has(task['Task key'])) {
      blockers.push({ code: 'REFERENCE_DECISION_MISSING_TASK', taskKey: task['Task key'] })
    }
  }

  return blockers
}

const countByCode = (blockers) => blockers.reduce((counts, blocker) => {
  counts[blocker.code] = (counts[blocker.code] || 0) + 1
  return counts
}, {})

export const auditReferenceRemediation = ({
  products,
  producers,
  ratings = [],
  cellar = [],
  decisions = []
}) => {
  const { sourceAudit, tasks } = buildReferenceRemediationTasks({
    products,
    producers,
    ratings,
    cellar
  })
  const blockers = sourceAudit.blockers
    .filter((blocker) => !['MISSING_PRODUCT_REFERENCE', 'MISSING_PRODUCER_REFERENCE'].includes(blocker.code))
    .map((blocker) => ({
      code: 'SOURCE_BLOCKER_OUTSIDE_REFERENCE_REMEDIATION',
      sourceCode: blocker.code,
      collection: blocker.collection,
      row: blocker.row,
      value: blocker.value ?? null
    }))

  blockers.push(...auditReferenceDecisionLedger({ tasks, decisions, products, producers }))

  const mappedDecisions = decisions.filter((record) => textValue(record.Decision).toLowerCase() === 'mapped').length
  const rejectedDecisions = decisions.filter((record) => textValue(record.Decision).toLowerCase() === 'rejected').length
  const sourceReferenceOccurrences = sourceAudit.blockers.filter((blocker) => (
    ['MISSING_PRODUCT_REFERENCE', 'MISSING_PRODUCER_REFERENCE'].includes(blocker.code)
  )).length

  return {
    planId: REFERENCE_REMEDIATION_PLAN_ID,
    certificationScope: 'reference-decision-ledger-only',
    status: blockers.length ? 'BLOCKED' : 'PASS',
    sourceImportStatus: sourceAudit.status,
    sourceCountsByCode: sourceAudit.countsByCode,
    counts: {
      sourceReferenceOccurrences,
      remediationTasks: tasks.length,
      decisionRows: decisions.length,
      mappedDecisions,
      rejectedDecisions,
      blockers: blockers.length
    },
    countsByCode: countByCode(blockers),
    blockers,
    tasks
  }
}

const csvCell = (value) => {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const renderReferenceDecisionTemplate = (tasks) => {
  const rows = [REFERENCE_LEDGER_FIELDS]
  for (const task of tasks) {
    rows.push(REFERENCE_LEDGER_FIELDS.map((field) => task[field] ?? ''))
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`
}

const readCsv = (filePath) => parseCsv(fs.readFileSync(path.resolve(filePath), 'utf8'))

const parseArguments = (arguments_) => {
  const options = {}
  const allowed = new Set(['products', 'producers', 'ratings', 'cellar', 'decisions', 'template', 'output'])
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    const name = key?.startsWith('--') ? key.slice(2) : ''
    if (!allowed.has(name) || !value || options[name]) {
      throw new Error('Arguments must use --name path pairs.')
    }
    options[name] = value
  }
  if (!options.products || !options.producers) {
    throw new Error('--products and --producers are required.')
  }
  return options
}

const fingerprintText = (contents) => ({
  bytes: Buffer.byteLength(contents),
  sha256: createHash('sha256').update(contents).digest('hex')
})

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const products = readCsv(options.products)
  const producers = readCsv(options.producers)
  const ratings = options.ratings ? readCsv(options.ratings) : []
  const cellar = options.cellar ? readCsv(options.cellar) : []
  const decisions = options.decisions ? readCsv(options.decisions) : []
  const report = auditReferenceRemediation({ products, producers, ratings, cellar, decisions })
  const suppliedInputs = ['products', 'producers', 'ratings', 'cellar', 'decisions']
    .filter((name) => options[name])
  const inputs = Object.fromEntries(
    suppliedInputs.map((name) => [name, {
      file: path.basename(path.resolve(options[name])),
      ...fingerprintCsv(options[name])
    }])
  )
  let template

  if (options.template) {
    const contents = renderReferenceDecisionTemplate(report.tasks)
    fs.writeFileSync(path.resolve(options.template), contents)
    template = {
      file: path.basename(path.resolve(options.template)),
      ...fingerprintText(contents)
    }
  }

  const rendered = `${JSON.stringify({ ...report, inputs, ...(template ? { template } : {}) }, null, 2)}\n`
  if (options.output) fs.writeFileSync(path.resolve(options.output), rendered)
  process.stdout.write(rendered)
  return report.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}