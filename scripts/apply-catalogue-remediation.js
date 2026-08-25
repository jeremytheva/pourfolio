import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { auditCatalogue } from './audit-catalogue-source.js'
import {
  auditCatalogueDecisionLedger,
  buildCatalogueRemediationTasks
} from './audit-catalogue-remediation.js'
import { parseCsv } from './audit-import-references.js'

const textValue = (value) => String(value ?? '').trim()
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const naturalCompare = (left, right) => String(left).localeCompare(String(right), 'en', { numeric: true })

const cloneRecords = (records) => records.map((record) => ({ ...record }))

const parseTaskRecordRefs = (task) => textValue(task['Source record IDs'])
  .split(';')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    const separator = value.indexOf(':')
    if (separator <= 0 || separator === value.length - 1) throw new Error(`Invalid source record reference for task ${task['Task key']}.`)
    return { collection: value.slice(0, separator), id: value.slice(separator + 1) }
  })

const taskMutationField = (task) => {
  const code = task['Issue code']
  if (code === 'MISSING_PRODUCER_REFERENCE') return { collection: 'products', field: 'producer_id' }
  if (['MISSING_CATEGORY_REFERENCE', 'PRODUCT_CATEGORY_ANCESTRY_INVALID'].includes(code)) {
    return { collection: 'products', field: 'product_category_id' }
  }
  if (['CATEGORY_PARENT_MISSING', 'CATEGORY_SELF_LINK', 'CATEGORY_CYCLE'].includes(code)) {
    return { collection: 'categories', field: 'parent_id' }
  }
  return null
}

const nameFieldForCollection = (collection) => {
  if (collection === 'products') return 'product_name'
  if (collection === 'producers') return 'producer_name'
  if (collection === 'categories') return 'category_name'
  return null
}

const taskEditField = (task, ref) => {
  const explicit = textValue(task['Affected field'])
  if (explicit) return explicit
  if (task['Issue code'] === 'PUBLIC_TEXT_ENCODING_SUSPECT') return nameFieldForCollection(ref.collection)
  return null
}

const indexCollection = (records) => new Map(records.map((record) => [textValue(record.id), record]))

const assertSingleRef = (task, refs, operation) => {
  if (refs.length !== 1) throw new Error(`${operation} requires exactly one source record for task ${task['Task key']}.`)
  return refs[0]
}

const assertKnownCollection = (collections, collection, taskKey) => {
  if (!Object.hasOwn(collections, collection)) throw new Error(`Unsupported source collection for task ${taskKey}.`)
}

const mutateCandidate = ({ products, producers, categories, tasks, decisions }) => {
  const collections = {
    products: cloneRecords(products),
    producers: cloneRecords(producers),
    categories: cloneRecords(categories)
  }
  const decisionsByKey = new Map(decisions.map((decision) => [textValue(decision['Task key']), decision]))
  const acceptedDuplicateTaskKeys = new Set()
  const applied = []

  for (const task of tasks) {
    const decision = decisionsByKey.get(task['Task key'])
    const action = textValue(decision?.Decision).toLowerCase()
    const refs = parseTaskRecordRefs(task)

    if (action === 'accept') {
      if (task['Issue code'] === 'DUPLICATE_PRODUCT_SORT_KEY') acceptedDuplicateTaskKeys.add(task['Task key'])
      applied.push({ taskKey: task['Task key'], action, mutation: null })
      continue
    }

    if (action === 'remap') {
      const ref = assertSingleRef(task, refs, 'remap')
      const target = taskMutationField(task)
      if (!target || ref.collection !== target.collection) throw new Error(`Remap is not deterministic for task ${task['Task key']}.`)
      assertKnownCollection(collections, ref.collection, task['Task key'])
      const record = indexCollection(collections[ref.collection]).get(ref.id)
      if (!record) throw new Error(`Source record is unavailable for task ${task['Task key']}.`)
      record[target.field] = textValue(decision['Canonical ID'])
      applied.push({ taskKey: task['Task key'], action, mutation: `${ref.collection}.${target.field}` })
      continue
    }

    if (action === 'edit') {
      const ref = assertSingleRef(task, refs, 'edit')
      assertKnownCollection(collections, ref.collection, task['Task key'])
      const record = indexCollection(collections[ref.collection]).get(ref.id)
      const field = taskEditField(task, ref)
      if (!record || !field || field === 'id' || field === 'user_id' || !Object.hasOwn(record, field)) {
        throw new Error(`Edit field is not deterministic for task ${task['Task key']}.`)
      }
      record[field] = String(decision['Replacement value'] ?? '')
      applied.push({ taskKey: task['Task key'], action, mutation: `${ref.collection}.${field}` })
      continue
    }

    if (action === 'remove') {
      const ref = assertSingleRef(task, refs, 'remove')
      assertKnownCollection(collections, ref.collection, task['Task key'])
      const before = collections[ref.collection].length
      collections[ref.collection] = collections[ref.collection].filter((record) => textValue(record.id) !== ref.id)
      if (collections[ref.collection].length !== before - 1) throw new Error(`Source record is unavailable or ambiguous for task ${task['Task key']}.`)
      applied.push({ taskKey: task['Task key'], action, mutation: `${ref.collection}:remove` })
      continue
    }

    throw new Error(`Unsupported decision action for task ${task['Task key']}.`)
  }

  return { ...collections, acceptedDuplicateTaskKeys, applied }
}

export const buildCatalogueCandidate = ({ products, producers, categories, rootCategoryId, decisions }) => {
  const generated = buildCatalogueRemediationTasks({ products, producers, categories, rootCategoryId })
  const ledgerAudit = auditCatalogueDecisionLedger({
    tasks: generated.tasks,
    decisions,
    producers,
    categories
  })
  if (ledgerAudit.status !== 'PASS') {
    const error = new Error('Catalogue remediation ledger must PASS before candidate application.')
    error.code = 'CATALOGUE_REMEDIATION_LEDGER_BLOCKED'
    error.audit = ledgerAudit
    throw error
  }

  const candidate = mutateCandidate({
    products,
    producers,
    categories,
    tasks: generated.tasks,
    decisions
  })

  const candidateAudit = auditCatalogue({
    products: candidate.products,
    producers: candidate.producers,
    categories: candidate.categories,
    rootCategoryId
  })
  const candidateTasks = buildCatalogueRemediationTasks({
    products: candidate.products,
    producers: candidate.producers,
    categories: candidate.categories,
    rootCategoryId
  }).tasks
  const residualTaskKeys = new Set(candidateTasks.map((task) => task['Task key']))
  const approvedExceptions = [...candidate.acceptedDuplicateTaskKeys]
    .filter((taskKey) => residualTaskKeys.has(taskKey))
    .sort(naturalCompare)
  const approvedExceptionSet = new Set(approvedExceptions)

  const unapprovedResidualTasks = candidateTasks
    .filter((task) => !approvedExceptionSet.has(task['Task key']))
    .map((task) => ({ taskKey: task['Task key'], issueCode: task['Issue code'], occurrences: Number(task['Occurrence count']) }))
    .sort((a, b) => naturalCompare(a.taskKey, b.taskKey))

  return {
    status: unapprovedResidualTasks.length ? 'BLOCKED' : 'PASS',
    sourceAuditStatus: generated.sourceAudit.status,
    ledgerAudit,
    candidateAudit,
    candidate: {
      products: candidate.products,
      producers: candidate.producers,
      categories: candidate.categories
    },
    applied: candidate.applied,
    approvedExceptions,
    unapprovedResidualTasks
  }
}

const escapeCsv = (value) => {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const renderCsvRecords = (records, fields) => {
  const lines = [fields.map(escapeCsv).join(',')]
  for (const record of records) lines.push(fields.map((field) => escapeCsv(record[field] ?? '')).join(','))
  return `${lines.join('\n')}\n`
}

const headersFor = (records) => records.length ? Object.keys(records[0]).filter((key) => key !== '__row') : []

const fingerprint = (file, content, rows) => ({
  file,
  bytes: Buffer.byteLength(content, 'utf8'),
  rows,
  sha256: sha256(content)
})

export const renderCatalogueCandidateBundle = ({ result, productFields, producerFields, categoryFields }) => {
  const productsCsv = renderCsvRecords(result.candidate.products, productFields)
  const producersCsv = renderCsvRecords(result.candidate.producers, producerFields)
  const categoriesCsv = renderCsvRecords(result.candidate.categories, categoryFields)
  const outputs = [
    fingerprint('products.csv', productsCsv, result.candidate.products.length),
    fingerprint('producers.csv', producersCsv, result.candidate.producers.length),
    fingerprint('categories.csv', categoriesCsv, result.candidate.categories.length)
  ]
  const bundleSha256 = sha256(outputs.map((item) => `${item.file}\n${item.bytes}\n${item.rows}\n${item.sha256}`).join('\n'))
  return { productsCsv, producersCsv, categoriesCsv, outputs, bundleSha256 }
}

const parseArguments = (args) => {
  const allowed = new Set(['products', 'producers', 'categories', 'root-category-id', 'ledger', 'output-dir', 'report'])
  const options = {}
  for (let index = 0; index < args.length; index += 2) {
    const raw = args[index]
    const value = args[index + 1]
    const name = raw?.startsWith('--') ? raw.slice(2) : ''
    if (!allowed.has(name) || !value || options[name]) throw new Error('Arguments must use unique --name value pairs.')
    options[name] = value
  }
  for (const required of ['products', 'producers', 'categories', 'root-category-id', 'ledger', 'output-dir']) {
    if (!options[required]) throw new Error(`--${required} is required.`)
  }
  return options
}

const loadCsv = (filePath) => parseCsv(fs.readFileSync(path.resolve(filePath), 'utf8'))

export const runCli = (args) => {
  const options = parseArguments(args)
  const productPath = path.resolve(options.products)
  const producerPath = path.resolve(options.producers)
  const categoryPath = path.resolve(options.categories)
  const products = loadCsv(productPath)
  const producers = loadCsv(producerPath)
  const categories = loadCsv(categoryPath)
  const decisions = loadCsv(options.ledger)

  const result = buildCatalogueCandidate({
    products,
    producers,
    categories,
    rootCategoryId: options['root-category-id'],
    decisions
  })
  const bundle = renderCatalogueCandidateBundle({
    result,
    productFields: headersFor(products),
    producerFields: headersFor(producers),
    categoryFields: headersFor(categories)
  })

  const outputDir = path.resolve(options['output-dir'])
  for (const [sourcePath, outputName] of [[productPath, 'products.csv'], [producerPath, 'producers.csv'], [categoryPath, 'categories.csv']]) {
    if (sourcePath === path.join(outputDir, outputName)) throw new Error('Candidate output directory must not overwrite source files.')
  }
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'products.csv'), bundle.productsCsv)
  fs.writeFileSync(path.join(outputDir, 'producers.csv'), bundle.producersCsv)
  fs.writeFileSync(path.join(outputDir, 'categories.csv'), bundle.categoriesCsv)

  const report = {
    schema: 'pourfolio.catalogue-remediation-candidate.v1',
    status: result.status,
    counts: {
      applied: result.applied.length,
      approvedExceptions: result.approvedExceptions.length,
      unapprovedResidualTasks: result.unapprovedResidualTasks.length
    },
    approvedExceptions: result.approvedExceptions,
    unapprovedResidualTasks: result.unapprovedResidualTasks,
    outputs: bundle.outputs,
    bundleSha256: bundle.bundleSha256
  }
  const renderedReport = `${JSON.stringify(report, null, 2)}\n`
  if (options.report) fs.writeFileSync(path.resolve(options.report), renderedReport)
  process.stdout.write(renderedReport)
  return result.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.code || 'CATALOGUE_CANDIDATE_ERROR'}: ${error.message}\n`)
    process.exitCode = 2
  }
}
