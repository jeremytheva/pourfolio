import { safeErrorMessage, withTimeout } from './httpSecurity.js'

const normalisePayload = (payload) => payload?.data ?? payload?.records ?? payload?.items ?? payload ?? null

const getConfiguration = () => {
  const baseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL
  const secret = process.env.NOCODEBACKEND_SECRET_KEY

  if (!baseUrl || !secret) {
    const error = new Error('The production data service is not configured.')
    error.status = 503
    throw error
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    secret
  }
}

const buildUrl = (baseUrl, path, filters = {}) => {
  const url = new URL(`${baseUrl}/${String(path).replace(/^\/+/, '')}`)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  return url
}

const providerRequest = async (path, { method = 'GET', body, filters } = {}) => {
  const { baseUrl, secret } = getConfiguration()
  const upstream = await withTimeout((signal) => fetch(buildUrl(baseUrl, path, filters), {
    method,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${secret}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  }))

  const text = await upstream.text()
  const payload = text ? JSON.parse(text) : null

  if (!upstream.ok || payload?.error) {
    const error = new Error(safeErrorMessage(upstream.status))
    error.status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502
    throw error
  }

  return normalisePayload(payload)
}

export const dataProvider = {
  async list(collection, filters = {}) {
    const payload = await providerRequest(collection, { filters })
    if (Array.isArray(payload)) return payload
    return payload ? [payload] : []
  },

  async get(collection, id) {
    try {
      const payload = await providerRequest(`${collection}/${encodeURIComponent(id)}`)
      if (Array.isArray(payload)) return payload[0] || null
      return payload
    } catch (error) {
      if (error.status !== 404) throw error
      const records = await this.list(collection, { id })
      return records[0] || null
    }
  },

  create(collection, body) {
    return providerRequest(collection, { method: 'POST', body })
  },

  update(collection, id, body) {
    return providerRequest(`${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body })
  },

  remove(collection, id) {
    return providerRequest(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
