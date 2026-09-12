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

export const listAllBrewDoneItRecords = (collection, filters = {}, options = {}) => collectPagedRecords(
  (page, limit) => dataProvider.listPage(collection, { page, limit, filters }),
  options
)

export const __testables = { DEFAULT_PAGE_SIZE, DEFAULT_MAX_PAGES, invalidPage }
