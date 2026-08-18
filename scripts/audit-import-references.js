import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const POSITIVE_INTEGER = /^[1-9]\d*$/

export const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (character !== '\r') {
      field += character
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field.')
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [headers = [], ...dataRows] = rows
  const normalisedHeaders = headers.map((header) => header.replace(/^\uFEFF/, '').trim())
  return dataRows
    .filter((values) => values.some((value) => value.trim() !== ''))
    .map((values, rowIndex) => ({
      __row: rowIndex + 2,
      ...Object.fromEntries(normalisedHeaders.map((header, index) => [header, values[index] ?? '']))
    }))
}

const requireColumns = (records, required, label) => {
  const available = new Set(Object.keys(records[0] || {}).filter((key) => key !== '__row'))
  const missing = required.filter((column) => !available.has(column))
  if (missing.length) {
    throw new Error(`${label} is missing required column(s): ${missing.join(', ')}.`)
  }
}

const indexPositiveIds = (records, label, blockers) => {
  const ids = new Set()
  for (const record of records) {
    const id = String(record.id ?? '').trim()
    if (!POSITIVE_INTEGER.test(id)) {
      blockers.push({
        code: 'INVALID_PRIMARY_ID',
        collection: label,
        row: record.__row,
        value: id || null
      })
    } else if (ids.has(id)) {
      blockers.push({
        code: 'DUPLICATE_PRIMARY_ID',
        collection: label,
        row: record.__row,
        value: id
      })
    } else {
      ids.add(id)
    }
  }
  return ids
}

const checkProductReferences = (records, collection, productIds, blockers) => {
  for (const record of records) {
    const productId = String(record.product_id ?? record.current_product_id ?? '').trim()
    if (!POSITIVE_INTEGER.test(productId) || !productIds.has(productId)) {
      blockers.push({
        code: 'MISSING_PRODUCT_REFERENCE',
        collection,
        row: record.__row,
        value: productId || null
      })
    }
  }
}

const normaliseDecision = (value) => String(value ?? '').trim().toLowerCase()

const checkIndependentReview = (record, collection, blockers) => {
  const operator = String(record.Operator ?? '').trim()
  const reviewer = String(record.Reviewer ?? '').trim()
  const reviewedAt = String(record['Reviewed at (UTC)'] ?? '').trim()
  const evidence = String(record['Evidence reference'] ?? '').trim()

  if (!evidence) blockers.push({ code: 'EVIDENCE_REFERENCE_MISSING', collection, row: record.__row })
  if (!operator) blockers.push({ code: 'OPERATOR_MISSING', collection, row: record.__row })
  if (!reviewer) blockers.push({ code: 'REVIEWER_MISSING', collection, row: record.__row })
  if (operator && reviewer && operator === reviewer) {
    blockers.push({ code: 'REVIEWER_NOT_INDEPENDENT', collection, row: record.__row })
  }
  if (!reviewedAt || Number.isNaN(Date.parse(reviewedAt))) {
    blockers.push({ code: 'REVIEWED_AT_INVALID', collection, row: record.__row, value: reviewedAt || null })
  }
}

const checkBonusDecisionLedger = (records, blockers) => {
  if (!records.length) return
  requireColumns(
    records,
    ['Source variant', 'Source count', 'Decision', 'Canonical bonus ID', 'Rejection reason', 'Evidence reference', 'Operator', 'Reviewer', 'Reviewed at (UTC)'],
    'Bonus decision ledger'
  )

  let sourceCountTotal = 0
  const variants = new Set()
  for (const record of records) {
    checkIndependentReview(record, 'bonus_decisions', blockers)
    const variant = String(record['Source variant'] ?? '').trim()
    const sourceCount = String(record['Source count'] ?? '').trim()
    const decision = normaliseDecision(record.Decision)
    const canonicalBonusId = String(record['Canonical bonus ID'] ?? '').trim()
    const rejectionReason = String(record['Rejection reason'] ?? '').trim()

    if (!variant) {
      blockers.push({ code: 'BONUS_DECISION_MISSING_VARIANT', collection: 'bonus_decisions', row: record.__row })
    } else if (variants.has(variant)) {
      blockers.push({ code: 'BONUS_DECISION_DUPLICATE_VARIANT', collection: 'bonus_decisions', row: record.__row, value: variant })
    } else {
      variants.add(variant)
    }

    if (!POSITIVE_INTEGER.test(sourceCount)) {
      blockers.push({ code: 'BONUS_DECISION_INVALID_SOURCE_COUNT', collection: 'bonus_decisions', row: record.__row, value: sourceCount || null })
    } else {
      sourceCountTotal += Number(sourceCount)
    }

    if (decision === 'accepted' || decision === 'mapped') {
      if (!POSITIVE_INTEGER.test(canonicalBonusId)) {
        blockers.push({ code: 'BONUS_DECISION_MISSING_CANONICAL_ID', collection: 'bonus_decisions', row: record.__row, value: canonicalBonusId || null })
      }
    } else if (decision === 'rejected') {
      if (!rejectionReason) {
        blockers.push({ code: 'BONUS_DECISION_MISSING_REJECTION_REASON', collection: 'bonus_decisions', row: record.__row })
      }
    } else {
      blockers.push({ code: 'BONUS_DECISION_INVALID_DECISION', collection: 'bonus_decisions', row: record.__row, value: record.Decision || null })
    }
  }

  if (variants.size !== 10) {
    blockers.push({ code: 'BONUS_DECISION_VARIANT_COUNT_MISMATCH', collection: 'bonus_decisions', expected: 10, actual: variants.size })
  }
  if (sourceCountTotal !== 69) {
    blockers.push({ code: 'BONUS_DECISION_SOURCE_TOTAL_MISMATCH', collection: 'bonus_decisions', expected: 69, actual: sourceCountTotal })
  }
}

const checkCellarIdentityLedger = (records, blockers) => {
  if (!records.length) return
  requireColumns(
    records,
    ['Source record key', 'Verified owner ID', 'Verification method', 'Evidence reference', 'Confirmed destination cellar ID', 'Operator', 'Reviewer', 'Reviewed at (UTC)'],
    'Cellar identity ledger'
  )

  const sourceKeys = new Set()
  const destinationIds = new Set()
  for (const record of records) {
    checkIndependentReview(record, 'cellar_identity', blockers)
    const sourceKey = String(record['Source record key'] ?? '').trim()
    const ownerId = String(record['Verified owner ID'] ?? '').trim()
    const method = String(record['Verification method'] ?? '').trim()
    const evidence = String(record['Evidence reference'] ?? '').trim()
    const destinationId = String(record['Confirmed destination cellar ID'] ?? '').trim()

    if (!sourceKey) {
      blockers.push({ code: 'CELLAR_IDENTITY_MISSING_SOURCE_KEY', collection: 'cellar_identity', row: record.__row })
    } else if (sourceKeys.has(sourceKey)) {
      blockers.push({ code: 'CELLAR_IDENTITY_DUPLICATE_SOURCE_KEY', collection: 'cellar_identity', row: record.__row, value: sourceKey })
    } else {
      sourceKeys.add(sourceKey)
    }
    if (!ownerId) blockers.push({ code: 'CELLAR_IDENTITY_MISSING_OWNER', collection: 'cellar_identity', row: record.__row })
    if (!method) blockers.push({ code: 'CELLAR_IDENTITY_MISSING_METHOD', collection: 'cellar_identity', row: record.__row })
    if (!evidence) blockers.push({ code: 'CELLAR_IDENTITY_MISSING_EVIDENCE', collection: 'cellar_identity', row: record.__row })
    if (!POSITIVE_INTEGER.test(destinationId)) {
      blockers.push({ code: 'CELLAR_IDENTITY_INVALID_DESTINATION_ID', collection: 'cellar_identity', row: record.__row, value: destinationId || null })
    } else if (destinationIds.has(destinationId)) {
      blockers.push({ code: 'CELLAR_IDENTITY_DUPLICATE_DESTINATION_ID', collection: 'cellar_identity', row: record.__row, value: destinationId })
    } else {
      destinationIds.add(destinationId)
    }
  }

  if (records.length !== 399) {
    blockers.push({ code: 'CELLAR_IDENTITY_ROW_COUNT_MISMATCH', collection: 'cellar_identity', expected: 399, actual: records.length })
  }
}

export const auditImportData = ({ products, producers, ratings = [], cellar = [], bonusDecisions = [], cellarIdentity = [] }) => {
  requireColumns(products, ['id', 'product_name', 'producer_id'], 'Products CSV')
  requireColumns(producers, ['id', 'producer_name'], 'Producers CSV')
  if (ratings.length) {
    const keys = new Set(Object.keys(ratings[0]))
    if (!keys.has('product_id') && !keys.has('current_product_id')) {
      throw new Error('Ratings CSV requires product_id or current_product_id.')
    }
  }
  if (cellar.length) requireColumns(cellar, ['product_id'], 'Cellar CSV')

  const blockers = []
  const productIds = indexPositiveIds(products, 'products', blockers)
  const producerIds = indexPositiveIds(producers, 'producers', blockers)

  for (const product of products) {
    const producerId = String(product.producer_id ?? '').trim()
    if (!POSITIVE_INTEGER.test(producerId) || !producerIds.has(producerId)) {
      blockers.push({
        code: 'MISSING_PRODUCER_REFERENCE',
        collection: 'products',
        row: product.__row,
        recordId: String(product.id || '') || null,
        value: producerId
      })
    }
  }

  checkProductReferences(ratings, 'ratings', productIds, blockers)
  checkProductReferences(cellar, 'cellar', productIds, blockers)
  checkBonusDecisionLedger(bonusDecisions, blockers)
  checkCellarIdentityLedger(cellarIdentity, blockers)

  const countsByCode = blockers.reduce((counts, blocker) => {
    counts[blocker.code] = (counts[blocker.code] || 0) + 1
    return counts
  }, {})

  return {
    status: blockers.length ? 'BLOCKED' : 'PASS',
    counts: {
      products: products.length,
      producers: producers.length,
      ratings: ratings.length,
      cellar: cellar.length,
      bonusDecisions: bonusDecisions.length,
      cellarIdentity: cellarIdentity.length,
      blockers: blockers.length
    },
    countsByCode,
    blockers
  }
}

export const fingerprintCsv = (filePath) => {
  const contents = fs.readFileSync(path.resolve(filePath))
  return {
    bytes: contents.byteLength,
    sha256: createHash('sha256').update(contents).digest('hex')
  }
}

const readCsv = (filePath) => parseCsv(fs.readFileSync(path.resolve(filePath), 'utf8'))

const parseArguments = (arguments_) => {
  const options = {}
  const allowed = new Set([
    'products', 'producers', 'ratings', 'cellar', 'bonus-decisions',
    'cellar-identity', 'output'
  ])
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

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const suppliedInputs = ['products', 'producers', 'ratings', 'cellar', 'bonus-decisions', 'cellar-identity']
    .filter((name) => options[name])
  const inputs = Object.fromEntries(
    suppliedInputs.map((name) => [name, {
      file: path.basename(path.resolve(options[name])),
      ...fingerprintCsv(options[name])
    }])
  )
  const report = auditImportData({
    products: readCsv(options.products),
    producers: readCsv(options.producers),
    ratings: options.ratings ? readCsv(options.ratings) : [],
    cellar: options.cellar ? readCsv(options.cellar) : [],
    bonusDecisions: options['bonus-decisions'] ? readCsv(options['bonus-decisions']) : [],
    cellarIdentity: options['cellar-identity'] ? readCsv(options['cellar-identity']) : []
  })
  const rendered = `${JSON.stringify({ ...report, inputs }, null, 2)}\n`
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
