import { safeErrorMessage, withTimeout } from './httpSecurity.js'

const DEFAULT_DATA_BASE_URL = 'https://api.nocodebackend.com'

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

  if (![page, pageSize].every(Number.isSafeInteger) || page < 1 || pageSize < 1 || items.length > requestedLimit) {
    throw providerContractError()
  }

  if (explicitTotal === undefined || explicitTotal === null || explicitTotal === '') {
    const completedBefore = (page - 1) * pageSize
    const hasPotentialNextPage = items.length === pageSize
    return {
      items,
      page,
      pageSize,
      total: completedBefore + items.length + (hasPotentialNextPage ? 1 : 0),
      totalPages: hasPotentialNextPage ? page + 1 : page,
      totalIsEstimate: hasPotentialNextPage
    }
  }

  const total = Number(explicitTotal)
  const totalPages = Number(explicitTotalPages ?? Math.ceil(total / pageSize))
  if (![total, totalPages].every(Number.isSafeInteger) || total < 0 || totalPages < 0) throw providerContractError()
  return { items, page, pageSize, total, totalPages }
}

const getProviderErrorCode = (status, filters = {}) => {
  if (status === 409 && filters?.expected_version !== undefined) return 'VERSION_CONFLICT'
  if (status === 409) return 'UNIQUE_CONFLICT'
  return 'PROVIDER_ERROR'
}

const looksLikeLegacyLambdaProxy = (baseUrl) => {
  try {
    const { hostname } = new URL(baseUrl)
    return hostname.includes('.lambda-url.') && hostname.endsWith('.on.aws')
  } catch {
    return false
  }
}

const getConfiguration = () => {
  const configuredBaseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()
  const secret = process.env.NOCODEBACKEND_SECRET_KEY
  if (!secret) {
    const error = new Error('The production data service is not configured.')
    error.status = 503
    error.code = 'DATA_CONFIGURATION_MISSING'
    throw error
  }
  const baseUrl = !configuredBaseUrl || looksLikeLegacyLambdaProxy(configuredBaseUrl)
    ? DEFAULT_DATA_BASE_URL
    : configuredBaseUrl
  return { baseUrl: baseUrl.replace(/\/+$/, ''), secret }
}

const buildUrl = (baseUrl, path, filters = {}) => {
  const url = new URL(`${baseUrl}/${String(path).replace(/^\/+/, '')}`)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  return url
}

const providerRequest = async (path, { method = 'GET', body, filters, preserveEnvelope = false } = {}) => {
  const { baseUrl, secret } = getConfiguration()
  let upstream
  try {
    upstream = await withTimeout((signal) => fetch(buildUrl(baseUrl, path, filters), {
      method,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${secret}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    }))
  } catch {
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
    throw providerContractError()
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
    const payload = await providerRequest(collection, { filters })
    if (Array.isArray(payload)) return payload
    return payload ? [payload] : []
  },
  async listPage(collection, { search, page, limit, orderBy, order = 'asc', filters = {} }) {
    const payload = await providerRequest(collection, {
      filters: { ...filters, search, page, limit, order_by: orderBy, order },
      preserveEnvelope: true
    })
    return normalisePage(payload, page, limit)
  },
  async get(collection, id) {
    try {
      const payload = await providerRequest(`${collection}/${encodeURIComponent(id)}`)
      const record = Array.isArray(payload) ? payload[0] || null : payload
      if (record && String(record.id) !== String(id)) throw providerContractError()
      return record
    } catch (error) {
      if (error.status !== 404) throw error
      const records = await this.list(collection, { id })
      return records.find((record) => record && String(record.id) === String(id)) || null
    }
  },
  create(collection, body) { return providerRequest(collection, { method: 'POST', body }) },
  update(collection, id, body) { return providerRequest(`${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body }) },
  compareAndSet(collection, id, expectedVersion, body) {
    return providerRequest(`${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body, filters: { expected_version: expectedVersion } })
  },
  remove(collection, id) { return providerRequest(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
}

export const __testables = { looksLikeLegacyLambdaProxy, normalisePage, DEFAULT_DATA_BASE_URL }
