import { dataProvider } from './dataProvider.js'

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_MAX_PAGES = 1000

const invalidPage = () => {
  const error = new Error('Brew Done It could not read a complete provider data set.')
  error.status = 502
  error.code = 'PROVIDER_ERROR'
  return error
}

export const collectPagedRecords = async (fetchPage, {
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = DEFAULT_MAX_PAGES
} = {}) => {
  if (typeof fetchPage !== 'function' || !Number.isSafeInteger(pageSize) || pageSize < 1 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1) throw invalidPage()

  const records = []
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page, pageSize)
    if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.totalPages) || result.totalPages < 0) {
      throw invalidPage()
    }
    records.push(...result.items)
    if (result.totalPages === 0 || page >= result.totalPages) return records
  }
  throw invalidPage()
}

const exactScalar = value => (typeof value === 'string' && value.trim() !== '') || Number.isSafeInteger(value)

export const listAllBrewDoneItRecords = async (collection, filters = {}, options = {}) => {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(filters))) throw invalidPage()
  const entries = Object.entries(filters)
  if (entries.some(([key, value]) => !/^[a-z][a-z0-9_]*$/.test(key) || !exactScalar(value))) throw invalidPage()
  const exactFilters = Object.fromEntries(entries)
  return collectPagedRecords(async (page, limit) => {
    const result = await dataProvider.listPage(collection, { page, limit, filters: exactFilters })
    // Provider filtering is not an authorisation boundary. Reject the entire
    // read before any caller can project or reconcile a foreign row.
    if (entries.length && (!Array.isArray(result?.items) || !result.items.every(row =>
      row && typeof row === 'object' && !Array.isArray(row) && entries.every(([key, value]) =>
        Object.hasOwn(row, key) && exactScalar(row[key]) && String(row[key]) === String(value)
      )
    ))) throw invalidPage()
    return result
  }, options)
}

export const __testables = { DEFAULT_PAGE_SIZE, DEFAULT_MAX_PAGES, invalidPage }
