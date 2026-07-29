import fs from 'node:fs'
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

export const auditImportData = ({ products, producers, ratings = [], cellar = [] }) => {
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
      blockers: blockers.length
    },
    countsByCode,
    blockers
  }
}

const readCsv = (filePath) => parseCsv(fs.readFileSync(path.resolve(filePath), 'utf8'))

const parseArguments = (arguments_) => {
  const options = {}
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    if (!key?.startsWith('--') || !value) {
      throw new Error('Arguments must use --name path pairs.')
    }
    options[key.slice(2)] = value
  }
  if (!options.products || !options.producers) {
    throw new Error('--products and --producers are required.')
  }
  return options
}

export const runCli = (arguments_) => {
  const options = parseArguments(arguments_)
  const report = auditImportData({
    products: readCsv(options.products),
    producers: readCsv(options.producers),
    ratings: options.ratings ? readCsv(options.ratings) : [],
    cellar: options.cellar ? readCsv(options.cellar) : []
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
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
