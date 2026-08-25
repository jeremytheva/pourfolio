import { createHash } from 'node:crypto'

const FULL_SHA = /^[0-9a-f]{40}$/
const POSITIVE_ID = /^[1-9]\d*$/
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))

const requireKeys = (value, allowed, label) => {
  if (!plainObject(value)) throw new Error(`${label} must be a plain object.`)
  const keys = Object.keys(value)
  const unexpected = keys.filter((key) => !allowed.includes(key))
  const missing = allowed.filter((key) => !keys.includes(key))
  if (unexpected.length || missing.length) throw new Error(`${label} fields are invalid.`)
}

const canonicalId = (value) => {
  const id = String(value)
  if (!POSITIVE_ID.test(id)) throw new Error('Catalogue evidence contains an invalid stable product id.')
  return id
}

const safeInteger = (value, label, minimum = 0) => {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${label} must be a safe integer.`)
  return value
}

const canonicalIds = (ids) => {
  if (!Array.isArray(ids)) throw new Error('Catalogue evidence item ids must be an array.')
  const values = ids.map(canonicalId)
  if (new Set(values).size !== values.length) throw new Error('Catalogue evidence item ids must be unique.')
  return values.sort((left, right) => Number(left) - Number(right))
}

const normalisePage = (page, label) => {
  requireKeys(page, ['page', 'totalPages', 'totalItems', 'itemIds'], label)
  const current = safeInteger(page.page, `${label}.page`, 1)
  const totalPages = safeInteger(page.totalPages, `${label}.totalPages`, 1)
  const totalItems = safeInteger(page.totalItems, `${label}.totalItems`)
  if (current > totalPages) throw new Error(`${label} page exceeds total pages.`)
  return { page: current, totalPages, totalItems, itemIds: canonicalIds(page.itemIds) }
}

export const buildCatalogueCertificationEvidence = ({ releaseSha, observedAt, browsePages, search, detail }) => {
  if (!FULL_SHA.test(String(releaseSha || ''))) throw new Error('Catalogue evidence requires a full lowercase release SHA.')
  if (!ISO_UTC.test(String(observedAt || '')) || Number.isNaN(Date.parse(observedAt))) throw new Error('Catalogue evidence requires a canonical UTC timestamp.')
  if (!Array.isArray(browsePages) || browsePages.length === 0) throw new Error('Catalogue evidence requires at least one browse page.')

  const browse = browsePages.map((page, index) => normalisePage(page, `browsePages[${index}]`)).sort((a, b) => a.page - b.page)
  const expectedPages = browse[0].totalPages
  const expectedItems = browse[0].totalItems
  if (browse.some((page) => page.totalPages !== expectedPages || page.totalItems !== expectedItems)) throw new Error('Catalogue browse metadata is inconsistent.')
  if (browse.some((page, index) => page.page !== index + 1)) throw new Error('Catalogue browse pages must be contiguous from page 1.')
  const browseIds = browse.flatMap((page) => page.itemIds)
  if (new Set(browseIds).size !== browseIds.length) throw new Error('Catalogue browse product ids must be unique across pages.')

  requireKeys(search, ['querySha256', 'page', 'totalPages', 'totalItems', 'itemIds'], 'search')
  if (!/^[0-9a-f]{64}$/.test(String(search.querySha256 || ''))) throw new Error('Catalogue search query digest is invalid.')
  const searchPage = normalisePage({ page: search.page, totalPages: search.totalPages, totalItems: search.totalItems, itemIds: search.itemIds }, 'search')

  requireKeys(detail, ['productId'], 'detail')
  const detailId = canonicalId(detail.productId)
  if (!browseIds.includes(detailId) && !searchPage.itemIds.includes(detailId)) throw new Error('Catalogue detail identity was not observed in browse or search evidence.')

  const browseDigestInput = JSON.stringify(browse.map(({ page, totalPages, totalItems, itemIds }) => ({ page, totalPages, totalItems, itemIds })))
  const searchDigestInput = JSON.stringify({ querySha256: search.querySha256, ...searchPage })

  return Object.freeze({
    schema: 'pourfolio.connected-catalogue-evidence.v1',
    releaseSha,
    observedAt,
    browse: Object.freeze({
      pagesObserved: browse.length,
      totalPages: expectedPages,
      totalItems: expectedItems,
      itemCountObserved: browseIds.length,
      idsSha256: sha256(JSON.stringify([...browseIds].sort((a, b) => Number(a) - Number(b)))),
      observationSha256: sha256(browseDigestInput)
    }),
    search: Object.freeze({
      querySha256: search.querySha256,
      page: searchPage.page,
      totalPages: searchPage.totalPages,
      totalItems: searchPage.totalItems,
      itemCountObserved: searchPage.itemIds.length,
      idsSha256: sha256(JSON.stringify(searchPage.itemIds)),
      observationSha256: sha256(searchDigestInput)
    }),
    detail: Object.freeze({ productId: detailId }),
    bundleSha256: sha256(JSON.stringify({ releaseSha, browse: browseDigestInput, search: searchDigestInput, detailId }))
  })
}

export const digestSearchQuery = (value) => {
  if (typeof value !== 'string' || value.length === 0) throw new Error('Catalogue search query is required.')
  return sha256(value)
}
