const DATA_API_BASE_URL = '/api/nocodebackend'
const AUTH_API_BASE_URL = '/api/nocodebackend/auth'
const REQUEST_TIMEOUT_MS = 12_000

const PROVIDER_ALIASES = {
  emailPassword: ['emailPassword', 'email_password', 'email-password', 'password', 'credentials', 'email'],
  emailOtp: ['emailOtp', 'email_otp', 'email-otp', 'otp', 'magicLink', 'magic_link', 'emailCode'],
  google: ['google', 'googleOAuth', 'google_oauth', 'oauth_google']
}

const PROVIDER_NAMES = new Set(Object.values(PROVIDER_ALIASES).flat().map((name) => name.toLowerCase()))

export class ApiError extends Error {
  constructor(message, { status = 0, requestId = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

const parsePayload = async (response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('The server returned an invalid response.', {
      status: response.status,
      requestId: response.headers.get('x-request-id')
    })
  }
}

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The request timed out. Please try again.')
    throw new ApiError('The service could not be reached. Please check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

const request = async (baseUrl, path, options = {}) => {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    credentials: 'include',
    method: options.method || 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' })
    },
    body: options.body === undefined
      ? undefined
      : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
  })
  const payload = await parsePayload(response)

  if (!response.ok || payload?.error) {
    throw new ApiError(payload?.error || 'The request could not be completed.', {
      status: response.status,
      requestId: payload?.requestId || response.headers.get('x-request-id')
    })
  }

  return payload
}

export const apiRequest = (path, options) => request(DATA_API_BASE_URL, path, options)

export const toAuthError = (error) => {
  if (error instanceof Error) return error
  return new ApiError(error?.message || 'Authentication request failed.')
}

export const authRequest = async (path, options = {}) => {
  try {
    return await request(AUTH_API_BASE_URL, path, options)
  } catch (error) {
    throw toAuthError(error)
  }
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

const hasRecognisedProvider = (source) => {
  if (typeof source === 'string') return PROVIDER_NAMES.has(source.toLowerCase())
  if (Array.isArray(source)) return source.some(hasRecognisedProvider)
  if (!source || typeof source !== 'object') return false

  return Object.entries(source).some(([key, value]) =>
    PROVIDER_NAMES.has(key.toLowerCase()) ||
    (['name', 'provider', 'id', 'type', 'key'].includes(key) && hasRecognisedProvider(value)) ||
    (['providers', 'data', 'authProviders', 'enabledProviders'].includes(key) && hasRecognisedProvider(value))
  )
}

export const getAuthProviders = async () => {
  const payload = await authRequest('/providers', { method: 'GET' })
  if (!hasRecognisedProvider(payload)) throw new ApiError('The server returned an invalid response.')
  return normalizeProviders(payload)
}

export const getGoogleSignInUrl = (redirectTo = window.location.origin) => {
  const params = new URLSearchParams({ redirectTo })
  return `${AUTH_API_BASE_URL}/sign-in/google?${params}`
}

// Legacy collection access is retained only for currently disabled prototype
// modules. Launch routes use the explicit service functions below so adding a
// new collection cannot silently expand the browser's data authority.
export const nocodeBackend = {
  async list(collection, { filters = {} } = {}) {
    const params = new URLSearchParams(filters)
    try {
      const payload = await apiRequest(`/collections/${encodeURIComponent(collection)}?${params}`)
      return { data: payload?.items || [], error: null }
    } catch (error) {
      return { data: [], error }
    }
  },
  async get(collection, id) {
    try {
      const payload = await apiRequest(`/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`)
      return { data: payload?.item || null, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
  async create(collection, data) {
    try {
      const payload = await apiRequest(`/collections/${encodeURIComponent(collection)}`, { method: 'POST', body: data })
      return { data: payload?.item || null, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
  async update(collection, id, data) {
    try {
      const payload = await apiRequest(`/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: data
      })
      return { data: payload?.item || null, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
  async remove(collection, id) {
    try {
      await apiRequest(`/collections/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

export default nocodeBackend
