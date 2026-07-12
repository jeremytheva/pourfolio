const AUTH_API_BASE_URL = '/api/nocodebackend/auth'

const PROVIDER_ALIASES = {
  emailPassword: ['emailPassword', 'email_password', 'email-password', 'password', 'credentials', 'email'],
  emailOtp: ['emailOtp', 'email_otp', 'email-otp', 'otp', 'magicLink', 'magic_link', 'emailCode'],
  google: ['google', 'googleOAuth', 'google_oauth', 'oauth_google']
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
  const payload = text ? JSON.parse(text) : null

  if (!response.ok || payload?.error) {
    throw toAuthError(payload?.error || payload || response.statusText)
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
