import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { parseCsv } from './audit-import-references.js'

const POSITIVE_INTEGER = /^[1-9]\d*$/
const UNSAFE_TEXT = /\uFFFD|Ã.|Â.|â(?:€|€™|€œ|€œ|€“|€”)/

const requiredHeaders = {
  products: ['id', 'user_id', 'product_name', 'product_category_id', 'producer_id', 'abv', 'ibu', 'collaboration'],
  producers: ['id', 'user_id', 'producer_name'],
  categories: ['id', 'user_id', 'category_name', 'parent_id']
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const clean = (value) => String(value ?? '').trim()
const normaliseSortKey = (value) => clean(value).normalize('NFKC').toLocaleLowerCase('en-AU').replace(/\s+/g, ' ')
const containsControlCharacter = (value) => {
  for (const character of String(value ?? '')) {
    const code = character.codePointAt(0)
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) return true
  }
  return false
}

const headersOf = (text) => {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || ''
  const records = parseCsv(`${firstLine}\n__sentinel__\n`)
  return records[0] ? Object.keys(records[0]).filter((key) => key !== '__row') : []
}

const requireHeaders = (text, required, label) => {
  const headers = new Set(headersOf(text))
  const missing = required.filter((name) => !headers.has(name))
  if (missing.length) throw new Error(`${label} is missing required column(s): ${missing.join(', ')}.`)
}

const add = (blockers, code, collection, row, recordId, extra = {}) => {
  blockers.push({ code, collection, ...(row ? { row } : {}), ...(recordId ? { recordId: String(recordId) } : {}), ...extra })
}

const validateIdentityAndText = (records, collection, nameField, blockers) => {
  const ids = new Set()
  for (const record of records) {
    const id = clean(record.id)
    const name = String(record[nameField] ?? '')
    if (!POSITIVE_INTEGER.test(id)) add(blockers, 'INVALID_PRIMARY_ID', collection, record.__row, id || null)
    else if (ids.has(id)) add(blockers, 'DUPLICATE_PRIMARY_ID', collection, record.__row, id)
    else ids.add(id)
    if (!name || name !== name.trim()) add(blockers, 'INVALID_PUBLIC_NAME', collection, record.__row, id || null)
    if (containsControlCharacter(name)) add(blockers, 'PUBLIC_TEXT_CONTROL_CHARACTER', collection, record.__row, id || null)
    if (UNSAFE_TEXT.test(name)) add(blockers, 'PUBLIC_TEXT_ENCODING_SUSPECT', collection, record.__row, id || null)
    if (clean(record.user_id)) add(blockers, 'CATALOGUE_OWNER_NOT_BLANK', collection, record.__row, id || null)
  }
  return ids
}

const validateOptionalNumber = (record, field, blockers) => {
  const value = clean(record[field])
  if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) add(blockers, 'INVALID_OPTIONAL_NUMBER', 'products', record.__row, clean(record.id) || null, { field })
}

const categoryAncestry = (categoryId, categoryById, rootId) => {
  const seen = new Set()
  let current = categoryId
  while (current) {
    if (current === rootId) return { ok: true }
    if (seen.has(current)) return { ok: false, code: 'CATEGORY_CYCLE' }
    seen.add(current)
    const category = categoryById.get(current)
    if (!category) return { ok: false, code: 'MISSING_CATEGORY_REFERENCE' }
    const parent = clean(category.parent_id)
    if (!parent) return { ok: false, code: 'CATEGORY_NOT_UNDER_LAUNCH_ROOT' }
    current = parent
  }
  return { ok: false, code: 'CATEGORY_NOT_UNDER_LAUNCH_ROOT' }
}

export const auditCatalogue = ({ products, producers, categories, rootCategoryId }) => {
  if (!POSITIVE_INTEGER.test(String(rootCategoryId))) throw new Error('root-category-id must be a positive integer.')
  const rootId = String(rootCategoryId)
  const blockers = []
  validateIdentityAndText(products, 'products', 'product_name', blockers)
  const producerIds = validateIdentityAndText(producers, 'producers', 'producer_name', blockers)
  const categoryIds = validateIdentityAndText(categories, 'categories', 'category_name', blockers)
  const categoryById = new Map(categories.filter((r) => POSITIVE_INTEGER.test(clean(r.id))).map((r) => [clean(r.id), r]))
  if (!categoryIds.has(rootId)) add(blockers, 'LAUNCH_ROOT_MISSING', 'categories', null, rootId)

  for (const category of categories) {
    const id = clean(category.id)
    const parent = clean(category.parent_id)
    if (parent && !categoryIds.has(parent)) add(blockers, 'CATEGORY_PARENT_MISSING', 'categories', category.__row, id)
    if (parent && parent === id) add(blockers, 'CATEGORY_SELF_LINK', 'categories', category.__row, id)
    if (POSITIVE_INTEGER.test(id)) {
      const ancestry = categoryAncestry(id, categoryById, rootId)
      if (!ancestry.ok && ancestry.code === 'CATEGORY_CYCLE') add(blockers, 'CATEGORY_CYCLE', 'categories', category.__row, id)
    }
  }

  const sortGroups = new Map()
  for (const product of products) {
    const id = clean(product.id)
    const producerId = clean(product.producer_id)
    const categoryId = clean(product.product_category_id)
    if (!producerIds.has(producerId)) add(blockers, 'MISSING_PRODUCER_REFERENCE', 'products', product.__row, id)
    if (!categoryIds.has(categoryId)) add(blockers, 'MISSING_CATEGORY_REFERENCE', 'products', product.__row, id)
    else {
      const ancestry = categoryAncestry(categoryId, categoryById, rootId)
      if (!ancestry.ok) add(blockers, 'PRODUCT_CATEGORY_ANCESTRY_INVALID', 'products', product.__row, id, { categoryId })
    }
    validateOptionalNumber(product, 'abv', blockers)
    validateOptionalNumber(product, 'ibu', blockers)
    const collaboration = clean(product.collaboration).toLowerCase()
    if (collaboration && !['true', 'false', '0', '1', 'yes', 'no'].includes(collaboration)) add(blockers, 'INVALID_COLLABORATION_FLAG', 'products', product.__row, id)
    for (const field of ['declared_category', 'edition']) {
      const value = String(product[field] ?? '')
      if (containsControlCharacter(value)) add(blockers, 'PUBLIC_TEXT_CONTROL_CHARACTER', 'products', product.__row, id, { field })
      if (UNSAFE_TEXT.test(value)) add(blockers, 'PUBLIC_TEXT_ENCODING_SUSPECT', 'products', product.__row, id, { field })
    }
    const key = normaliseSortKey(product.product_name)
    if (key) {
      const group = sortGroups.get(key) || []
      group.push({ row: product.__row, recordId: id })
      sortGroups.set(key, group)
    }
  }
  for (const group of sortGroups.values()) if (group.length > 1) for (const item of group) add(blockers, 'DUPLICATE_PRODUCT_SORT_KEY', 'products', item.row, item.recordId, { groupSize: group.length })

  blockers.sort((a, b) => a.code.localeCompare(b.code) || a.collection.localeCompare(b.collection) || (a.row || 0) - (b.row || 0) || String(a.recordId || '').localeCompare(String(b.recordId || ''), undefined, { numeric: true }))
  const countsByCode = {}
  for (const blocker of blockers) countsByCode[blocker.code] = (countsByCode[blocker.code] || 0) + 1
  return { status: blockers.length ? 'BLOCKED' : 'PASS', rootCategoryId: rootId, counts: { products: products.length, producers: producers.length, categories: categories.length, blockers: blockers.length }, countsByCode, blockers }
}

const fingerprint = (filePath, bytes, rows) => ({ file: path.basename(filePath), bytes: bytes.byteLength, rows, sha256: sha256(bytes) })

const parseArguments = (args) => {
  const options = {}
  const allowed = new Set(['products', 'producers', 'categories', 'root-category-id', 'output'])
  for (let i = 0; i < args.length; i += 2) {
    const raw = args[i]
    const value = args[i + 1]
    const name = raw?.startsWith('--') ? raw.slice(2) : ''
    if (!allowed.has(name) || !value || options[name]) throw new Error('Arguments must use unique --name value pairs.')
    options[name] = value
  }
  for (const required of ['products', 'producers', 'categories', 'root-category-id']) if (!options[required]) throw new Error(`--${required} is required.`)
  return options
}

export const runCli = (args) => {
  const options = parseArguments(args)
  const loaded = {}
  for (const name of ['products', 'producers', 'categories']) {
    const resolved = path.resolve(options[name])
    const bytes = fs.readFileSync(resolved)
    const text = bytes.toString('utf8')
    requireHeaders(text, requiredHeaders[name], `${name} CSV`)
    const records = parseCsv(text)
    loaded[name] = { resolved, bytes, records }
  }
  const inputs = ['products', 'producers', 'categories'].map((name) => fingerprint(loaded[name].resolved, loaded[name].bytes, loaded[name].records.length))
  const bundleSha256 = sha256(inputs.map((input) => `${input.file}\n${input.bytes}\n${input.rows}\n${input.sha256}`).join('\n'))
  const audit = auditCatalogue({ products: loaded.products.records, producers: loaded.producers.records, categories: loaded.categories.records, rootCategoryId: options['root-category-id'] })
  const report = { schema: 'pourfolio.catalogue-source-audit.v1', ...audit, inputs, bundleSha256 }
  const rendered = `${JSON.stringify(report, null, 2)}\n`
  if (options.output) fs.writeFileSync(path.resolve(options.output), rendered)
  process.stdout.write(rendered)
  return report.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = runCli(process.argv.slice(2)) } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2 }
}
