import { safeErrorMessage, withTimeout } from './httpSecurity.js'
import { resolveDataCredential } from './ncbCredentials.js'

const DEFAULT_DATA_BASE_URL = 'https://api.nocodebackend.com/'
const DEFAULT_INSTANCE = '54026_rating'

const normalisePayload = (payload) => {
  if (payload === undefined || payload === null) return null
  if (payload.data !== undefined) return payload.data
  if (payload.records !== undefined) return payload.records
  if (payload.items !== undefined) return payload.items
  if (payload.results !== undefined) return payload.results
  if (payload.record !== undefined) return payload.record
  return payload
}

const providerContractError = () => {
  const error = new Error(safeErrorMessage(502))
  error.status = 502
  error.code = 'PROVIDER_ERROR'
  return error
}

const normalisePage = (payload, requestedPage, requestedLimit) => {
  const records = normalisePayload(payload)
  const items = Array.isArray(records) ? records : records ? [records] : []
  const metadata = payload?.pagination || payload?.meta || payload || {}
  const page = Number(metadata.page ?? metadata.current_page ?? requestedPage)
  const pageSize = Number(metadata.pageSize ?? metadata.per_page ?? metadata.limit ?? requestedLimit)
  const explicitTotal = metadata.total ?? metadata.total_count
  const explicitTotalPages = metadata.totalPages ?? metadata.total_pages

  if (![page, pageSize].every(Number.isSafeInteger) || page < 1 || pageSize < 1) throw providerContractError()

  if (explicitTotal === undefined || explicitTotal === null || explicitTotal === '') {
    if (page !== requestedPage || pageSize !== requestedLimit || items.length > requestedLimit) throw providerContractError()
    const completedBefore = (page - 1) * pageSize
    const hasPotentialNextPage = items.length === pageSize
    const total = completedBefore + items.length + (hasPotentialNextPage ? 1 : 0)
    const totalPages = hasPotentialNextPage ? page + 1 : page
    return { items, page, pageSize, total, totalPages, totalIsEstimate: hasPotentialNextPage }
  }

  const total = Number(explicitTotal)
  const totalPages = Number(explicitTotalPages ?? Math.ceil(total / pageSize))
  if (![total, totalPages].every(Number.isSafeInteger) || total < 0 || totalPages < 0) throw providerContractError()

  const expectedTotalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const expectedItems = total === 0 ? 0 : page < totalPages ? pageSize : total - (pageSize * (totalPages - 1))
  if (page !== requestedPage || pageSize !== requestedLimit || totalPages !== expectedTotalPages ||
      page > Math.max(1, totalPages) || items.length !== expectedItems) throw providerContractError()
  return { items, page, pageSize, total, totalPages }
}

const requireExpectedRecord = (record, id) => {
  if (record && String(record.id) !== String(id)) throw providerContractError()
  return record
}

const getProviderErrorCode = (status, filters = {}) => {
  if (status === 409 && filters?.expected_version !== undefined) return 'VERSION_CONFLICT'
  if (status === 409) return 'UNIQUE_CONFLICT'
  if (status === 401) return 'DATA_PROVIDER_UNAUTHENTICATED'
  if (status === 403) return 'DATA_PROVIDER_FORBIDDEN'
  return 'PROVIDER_ERROR'
}

const resolveDataBaseUrl = (configuredBaseUrl) => {
  const value = configuredBaseUrl?.trim() || DEFAULT_DATA_BASE_URL
  try {
    return new URL(value).toString().replace(/\/+$/, '')
  } catch {
    const error = new Error('The production data service endpoint is invalid.')
    error.status = 503
    error.code = 'DATA_CONFIGURATION_INVALID'
    throw error
  }
}

const getConfiguration = () => {
  const configuredBaseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()
  const instance = process.env.NOCODEBACKEND_INSTANCE || DEFAULT_INSTANCE
  let credential

  try {
    credential = resolveDataCredential()
  } catch (cause) {
    const error = new Error('The production data service credential is not configured.')
    error.status = 503
    error.code = cause?.code === 'DATA_CREDENTIAL_MISSING' ? 'DATA_CREDENTIAL_MISSING' : 'DATA_CONFIGURATION_INVALID'
    throw error
  }

  return { baseUrl: resolveDataBaseUrl(configuredBaseUrl), secret: credential.value, instance }
}

const buildUrl = (baseUrl, path, filters = {}, instance = DEFAULT_INSTANCE) => {
  const url = new URL(`${baseUrl}/${String(path).replace(/^\/+/, '')}`)
  url.searchParams.set('Instance', instance)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  return url
}

const buildProviderHeaders = ({ secret, body }) => ({
  accept: 'application/json',
  authorization: `Bearer ${secret}`,
  ...(body === undefined ? {} : { 'content-type': 'application/json' })
})

const providerRequest = async (path, { method = 'GET', body, filters, preserveEnvelope = false } = {}) => {
  const { baseUrl, secret, instance } = getConfiguration()
  let upstream
  try {
    upstream = await withTimeout((signal) => fetch(buildUrl(baseUrl, path, filters, instance), {
      method,
      headers: buildProviderHeaders({ secret, body }),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    }))
  } catch (cause) {
    if (cause?.code === 'DATA_CONFIGURATION_INVALID' || cause?.code === 'DATA_CREDENTIAL_MISSING') throw cause
    const error = new Error(safeErrorMessage(502))
    error.status = 502
    error.code = 'PROVIDER_ERROR'
    throw error
  }

  let payload
  try {
    const text = await upstream.text()
    payload = text ? JSON.parse(text) : null
  } catch {
    const error = new Error(safeErrorMessage(502))
    error.status = 502
    error.code = 'PROVIDER_ERROR'
    throw error
  }

  if (!upstream.ok || payload?.error || payload?.success === false || payload?.status === 'error') {
    const error = new Error(safeErrorMessage(upstream.status))
    error.status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502
    error.code = getProviderErrorCode(error.status, filters)
    throw error
  }

  return preserveEnvelope ? payload : normalisePayload(payload)
}

export const dataProvider = {
  isUniqueConflict(error) { return error?.code === 'UNIQUE_CONFLICT' },
  async list(collection, filters = {}) {
    const payload = await providerRequest(`read/${collection}`, { filters })
    if (Array.isArray(payload)) return payload
    return payload ? [payload] : []
  },
  async listPage(collection, { search, page, limit, orderBy, order = 'asc', filters = {} }) {
    const searchFilter = search && collection === 'products' ? { 'product_name[like]': search } : {}
    const payload = await providerRequest(`read/${collection}`, {
      filters: { ...filters, ...searchFilter, page, limit, sort: orderBy, order }, preserveEnvelope: true
    })
    return normalisePage(payload, page, limit)
  },
  async get(collection, id) {
    try {
      const payload = await providerRequest(`read/${collection}/${encodeURIComponent(id)}`)
      return requireExpectedRecord(Array.isArray(payload) ? payload[0] || null : payload, id)
    } catch (error) {
      if (error.status !== 404) throw error
      const records = await this.list(collection, { id })
      return records.find((record) => record && String(record.id) === String(id)) || null
    }
  },
  create(collection, body) { return providerRequest(`create/${collection}`, { method: 'POST', body }) },
  update(collection, id, body) { return providerRequest(`update/${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body }) },
  compareAndSet(collection, id, expectedVersion, body) {
    return providerRequest(`update/${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body, filters: { expected_version: expectedVersion } })
  },
  remove(collection, id) { return providerRequest(`delete/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
}

export const __testables = {
  resolveDataBaseUrl,
  normalisePage,
  buildProviderHeaders,
  getProviderErrorCode,
  getConfiguration,
  DEFAULT_DATA_BASE_URL,
  DEFAULT_INSTANCE
}
