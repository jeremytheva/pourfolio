const DATA_API_BASE_URL = '/api/nocodebackend'
const AUTH_API_BASE_URL = '/api/nocodebackend/auth'
const REQUEST_TIMEOUT_MS = 12_000

const PROVIDER_ALIASES = {
  emailPassword: ['emailPassword', 'email_password', 'email-password', 'password', 'credentials', 'email'],
  emailOtp: ['emailOtp', 'email_otp', 'email-otp', 'otp', 'magicLink', 'magic_link', 'emailCode'],
  google: ['google', 'googleOAuth', 'google_oauth', 'oauth_google']
}

const PROVIDER_NAMES = new Set(Object.values(PROVIDER_ALIASES).flat().map((name) => name.toLowerCase()))
const PROVIDER_CONTAINER_KEYS = ['providers', 'authProviders', 'enabledProviders']
const PROVIDER_NAME_KEYS = ['name', 'provider', 'id', 'type', 'key']
const PROVIDER_STATE_KEYS = ['enabled', 'isEnabled', 'active']

export class ApiError extends Error {
  constructor(message, { status = 0, requestId = null, code = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
    this.code = code
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

  if (!response.ok || payload?.error || payload?.status === 'error') {
    throw new ApiError(payload?.error || payload?.message || 'The request could not be completed.', {
      status: response.status,
      requestId: payload?.requestId || response.headers.get('x-request-id'),
      code: payload?.code || null
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

const readProviderState = (source) => {
  const stateKeys = PROVIDER_STATE_KEYS.filter((key) => Object.hasOwn(source, key))
  if (stateKeys.length === 0) return true
  if (stateKeys.some((key) => typeof source[key] !== 'boolean')) return null

  const states = new Set(stateKeys.map((key) => source[key]))
  return states.size === 1 ? source[stateKeys[0]] : null
}

const collectProviderNames = (source, providers = []) => {
  if (typeof source === 'string') {
    if (!PROVIDER_NAMES.has(source.toLowerCase())) return providers
    return [...providers, { name: source, enabled: true }]
  }
  if (!source || typeof source !== 'object') return null

  if (Array.isArray(source)) {
    return source.reduce((collected, item) => (
      collected === null ? null : collectProviderNames(item, collected)
    ), providers)
  }

  const nameKeys = PROVIDER_NAME_KEYS.filter((key) => Object.hasOwn(source, key))
  if (nameKeys.length > 0) {
    if (nameKeys.length !== 1 || typeof source[nameKeys[0]] !== 'string') return null
    const name = source[nameKeys[0]]
    if (!PROVIDER_NAMES.has(name.toLowerCase())) return providers
    const allowedKeys = new Set([...PROVIDER_NAME_KEYS, ...PROVIDER_STATE_KEYS])
    if (Object.keys(source).some((key) => !allowedKeys.has(key))) return null
    const enabled = readProviderState(source)
    return enabled === null ? null : [...providers, { name, enabled }]
  }

  return Object.entries(source).reduce((collected, [name, value]) => {
    if (collected === null) return null
    if (!PROVIDER_NAMES.has(name.toLowerCase())) return collected
    if (typeof value === 'boolean') return [...collected, { name, enabled: value }]
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    if (Object.keys(value).some((key) => !PROVIDER_STATE_KEYS.includes(key))) return null
    const enabled = readProviderState(value)
    return enabled === null ? null : [...collected, { name, enabled }]
  }, providers)
}

const providerContainerKeys = (source) => (
  source && typeof source === 'object' && !Array.isArray(source)
    ? PROVIDER_CONTAINER_KEYS.filter((key) => Object.hasOwn(source, key))
    : []
)

const getProviderEntries = (payload) => {
  if (payload?.status === 'success' && payload?.data && providerContainerKeys(payload).length === 0) {
    payload = payload.data
  }

  if (Array.isArray(payload)) return collectProviderNames(payload)
  if (!payload || typeof payload !== 'object') return null

  const topLevelContainers = providerContainerKeys(payload)
  const nestedData = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : null
  const nestedContainers = providerContainerKeys(nestedData)

  if (topLevelContainers.length > 1 || nestedContainers.length > 1) return null
  if (topLevelContainers.length === 1 && nestedContainers.length === 1) return null
  if (topLevelContainers.length === 1) return collectProviderNames(payload[topLevelContainers[0]])
  if (nestedContainers.length === 1) return collectProviderNames(nestedData[nestedContainers[0]])

  return collectProviderNames(payload)
}

export const normalizeProviders = (payload) => {
  const entries = getProviderEntries(payload)
  if (!entries?.length) return null

  const states = new Map()
  for (const entry of entries) {
    const provider = Object.entries(PROVIDER_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => alias.toLowerCase() === entry.name.toLowerCase())
    )?.[0]
    if (!provider) continue
    if (states.has(provider) && states.get(provider) !== entry.enabled) return null
    states.set(provider, entry.enabled)
  }
  if (states.size === 0) return null

  return {
    emailPassword: states.get('emailPassword') === false ? false : true,
    emailOtp: states.get('emailOtp') === true,
    google: states.get('google') === true
  }
}

export const getAuthProviders = async () => {
  const payload = await authRequest('/providers', { method: 'GET' })
  const providers = normalizeProviders(payload)
  if (!providers) throw new ApiError('The server returned an invalid response.')
  return providers
}

export const getGoogleSignInUrl = (redirectTo = window.location.origin) => {
  const params = new URLSearchParams({ redirectTo })
  return `${AUTH_API_BASE_URL}/sign-in/google?${params}`
}

// Legacy collection access is retained only for currently disabled prototype
// modules. Launch routes use explicit service endpoints so browser code cannot
// silently expand its data authority or bypass server-side ownership policy.
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
