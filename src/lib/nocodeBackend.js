const DATA_API_BASE_URL = import.meta.env.VITE_NOCODEBACKEND_API_BASE_URL || '/api/nocodebackend'

const normalizeError = (error) => {
  if (!error) return null
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return error
}

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload
  return payload?.data ?? payload?.records ?? payload?.items ?? payload ?? null
}

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  })
  return params.toString()
}

const request = async (path, options = {}) => {
  try {
    const response = await fetch(`${DATA_API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    })

    const text = await response.text()
    const payload = text ? JSON.parse(text) : null

    if (!response.ok || payload?.error) {
      return { data: null, error: normalizeError(payload?.error || payload || response.statusText) }
    }

    return { data: normalizePayload(payload), error: null }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

const compareValues = (left, right) => {
  if (left === right) return 0
  if (left === null || left === undefined) return 1
  if (right === null || right === undefined) return -1
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

export const nocodeBackend = {
  list(collection, { filters = {}, orderBy, ascending = true, search } = {}) {
    return request(`/${collection}${buildQueryString(filters) ? `?${buildQueryString(filters)}` : ''}`).then(({ data, error }) => {
      if (error || !Array.isArray(data)) return { data: data || [], error }

      let records = data
      if (search?.term && search.fields?.length) {
        const term = search.term.toLowerCase()
        records = records.filter((record) => search.fields.some((field) => String(record[field] || '').toLowerCase().includes(term)))
      }

      if (orderBy) {
        records = [...records].sort((a, b) => {
          const result = compareValues(a[orderBy], b[orderBy])
          return ascending ? result : -result
        })
      }

      return { data: records, error: null }
    })
  },

  async get(collection, id) {
    const direct = await request(`/${collection}/${id}`)
    if (!direct.error) return direct

    const fallback = await this.list(collection, { filters: { id } })
    if (fallback.error) return { data: null, error: fallback.error }
    const record = fallback.data[0] || null
    return { data: record, error: record ? null : { message: 'Record not found' } }
  },

  create(collection, data) {
    return request(`/${collection}`, { method: 'POST', body: JSON.stringify(data) })
  },

  update(collection, id, updates) {
    return request(`/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
  },

  remove(collection, id) {
    return request(`/${collection}/${id}`, { method: 'DELETE' })
  }
}

export default nocodeBackend
