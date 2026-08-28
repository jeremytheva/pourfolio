import { withTimeout } from './httpSecurity.js'
import { resolveAuthCredential } from './ncbCredentials.js'

const DEFAULT_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'

const configuredInstance = () => process.env.NOCODEBACKEND_INSTANCE?.trim() || null

const requireConfiguredInstance = () => {
  const instance = configuredInstance()
  if (!instance) {
    const error = new Error('Server authentication instance is not configured.')
    error.status = 503
    error.code = 'AUTH_INSTANCE_MISSING'
    throw error
  }
  return instance
}

export const extractSessionUser = (payload) => {
  if (!payload || typeof payload !== 'object') return null

  const candidates = [
    payload.user,
    payload.data?.user,
    payload.session?.user,
    payload.data?.session?.user,
    payload.data,
    payload
  ]

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const id = candidate.id || candidate.user_id || candidate.userId || candidate._id
    if (!id) continue

    return {
      id: String(id),
      email: candidate.email || candidate.emailAddress || null,
      name: candidate.name || candidate.user_metadata?.name || null
    }
  }

  return null
}

export const buildSessionUrl = () => {
  const authBaseUrl = (process.env.NOCODEBACKEND_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL).replace(/\/+$/, '')
  const url = new URL(`${authBaseUrl}/get-session`)
  url.searchParams.set('instance', requireConfiguredInstance())
  return url
}

export const buildSessionHeaders = (request, secret) => ({
  accept: 'application/json',
  authorization: `Bearer ${secret}`,
  'x-database-instance': requireConfiguredInstance(),
  cookie: request.headers?.cookie || ''
})

export const requireSessionUser = async (request) => {
  let secret
  try {
    secret = resolveAuthCredential().value
    requireConfiguredInstance()
  } catch (cause) {
    const error = new Error('Server authentication is not configured.')
    error.status = 503
    error.code = cause?.code === 'AUTH_INSTANCE_MISSING' ? 'AUTH_INSTANCE_MISSING' : 'AUTH_CREDENTIAL_MISSING'
    throw error
  }

  const upstream = await withTimeout((signal) => fetch(buildSessionUrl(), {
    method: 'GET',
    headers: buildSessionHeaders(request, secret),
    signal
  }))

  if (!upstream.ok) {
    const error = new Error('Authentication is required.')
    error.status = 401
    throw error
  }

  const payload = await upstream.json().catch(() => null)
  const user = extractSessionUser(payload)
  if (!user) {
    const error = new Error('Authentication is required.')
    error.status = 401
    throw error
  }

  return user
}

export const __testables = {
  buildSessionHeaders,
  buildSessionUrl,
  configuredInstance,
  requireConfiguredInstance
}
