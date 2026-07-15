const DATA_API_BASE_URL = import.meta.env.VITE_NOCODEBACKEND_API_BASE_URL || '/api/nocodebackend'

const AUTH_API_BASE_URL = import.meta.env.VITE_NOCODEBACKEND_AUTH_BASE_URL || '/api/nocodebackend/auth'

const PROVIDER_ALIASES = {
  emailPassword: ['emailPassword', 'email_password', 'email-password', 'password', 'credentials', 'email'],
  emailOtp: ['emailOtp', 'email_otp', 'email-otp', 'otp', 'magicLink', 'magic_link', 'emailCode'],
  google: ['google', 'googleOAuth', 'google_oauth', 'oauth_google']
}

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

const previewRawBody = (responseText) => responseText.slice(0, 200)

const parseResponseBody = (responseText) => {
  const trimmedText = responseText.trim()
  if (!trimmedText) return { payload: null, parseError: null }

  try {
    return { payload: JSON.parse(trimmedText), parseError: null }
  } catch (error) {
    return {
      payload: null,
      parseError: {
        message: 'Response body was not valid JSON',
        rawBody: trimmedText,
        cause: error
      }
    }
  }
}

const buildHttpError = (response, parseError) => {
  const statusMessage = `${response.status} ${response.statusText || 'HTTP error'}`.trim()
  if (!parseError) return new Error(statusMessage)

  const preview = previewRawBody(parseError.rawBody)
  const error = new Error(`${statusMessage}: non-JSON response body${preview ? ` - ${preview}` : ''}`)
  error.status = response.status
  error.statusText = response.statusText
  error.rawBody = parseError.rawBody
  return error
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
    const { payload, parseError } = parseResponseBody(text)

    if (!response.ok) {
      return { data: null, error: normalizeError(payload?.error || payload || buildHttpError(response, parseError)) }
    }

    if (parseError || payload?.error) {
      return { data: null, error: normalizeError(parseError || payload.error) }
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

export const toAuthError = (error) => {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error(error?.message || 'Authentication request failed')
}

export const authRequest = async (path, options = {}) => {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const text = await response.text()
  const { payload, parseError } = parseResponseBody(text)

  if (!response.ok) {
    throw toAuthError(payload?.error || payload || buildHttpError(response, parseError))
  }

  if (parseError || payload?.error) {
    throw toAuthError(parseError || payload.error)
  }

  return payload
}

const collectProviderNames = (source, names = []) => {
  if (!source) return names

  if (Array.isArray(source)) {
    source.forEach((item) => collectProviderNames(item, names))
    return names
  }

  if (typeof source === 'string') {
    names.push(source)
    return names
  }

  if (typeof source !== 'object') return names

  const enabled = source.enabled ?? source.isEnabled ?? source.active ?? true
  const name = source.name || source.provider || source.id || source.type || source.key
  if (name && enabled) names.push(name)

  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'boolean' && value) names.push(key)
    if (['providers', 'data', 'authProviders', 'enabledProviders'].includes(key)) {
      collectProviderNames(value, names)
    }
  })

  return names
}

export const normalizeProviders = (payload) => {
  const providerNames = collectProviderNames(payload).map((name) => String(name).toLowerCase())

  return Object.fromEntries(
    Object.entries(PROVIDER_ALIASES).map(([provider, aliases]) => [
      provider,
      aliases.some((alias) => providerNames.includes(alias.toLowerCase()))
    ])
  )
}

export const getAuthProviders = async () => normalizeProviders(await authRequest('/providers', { method: 'GET' }))

export const getGoogleSignInUrl = (redirectTo = window.location.origin) => {
  const params = new URLSearchParams({ redirectTo })
  return `${AUTH_API_BASE_URL}/sign-in/google?${params}`
}

export default nocodeBackend
