import { withTimeout } from './httpSecurity.js'
import { resolveAuthCredential } from './ncbCredentials.js'
import { resolveAuthBaseUrl } from './nocodeBackendConfig.js'

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
  const url = new URL(`${resolveAuthBaseUrl()}/get-session`)
  url.searchParams.set('instance', requireConfiguredInstance())
  return url
}

export const buildSessionHeaders = (request, secret) => ({
  accept: 'application/json',
  authorization: `Bearer ${secret}`,
  'x-database-instance': requireConfiguredInstance(),
  cookie: request.headers?.cookie || ''
})

const requireSessionPayload = async (request, { signal } = {}) => {
  let secret
  try {
    secret = resolveAuthCredential().value
    resolveAuthBaseUrl()
    requireConfiguredInstance()
  } catch (cause) {
    const error = new Error('Server authentication is not configured.')
    error.status = 503
    error.code = ['AUTH_INSTANCE_MISSING', 'AUTH_CONFIGURATION_INVALID'].includes(cause?.code)
      ? cause.code
      : 'AUTH_CREDENTIAL_MISSING'
    throw error
  }

  const { upstream, payload } = await withTimeout(async (upstreamSignal) => {
    const upstream = await fetch(buildSessionUrl(), {
      method: 'GET',
      headers: buildSessionHeaders(request, secret),
      signal: upstreamSignal
    })
    const payload = upstream.ok ? await upstream.json().catch((error) => {
      if (upstreamSignal.aborted) throw error
      return null
    }) : null
    return { upstream, payload }
  }, undefined, signal)

  if (!upstream.ok) {
    const error = new Error('Authentication is required.')
    error.status = 401
    throw error
  }

  const user = extractSessionUser(payload)
  if (!user) {
    const error = new Error('Authentication is required.')
    error.status = 401
    throw error
  }

  return { user, payload }
}

export const requireSessionUser = async (request, options) => (await requireSessionPayload(request, options)).user

// Bounded catalogue-review identity, not a grant of mutable moderation access.
// The observed provider field is user.role. Do not fall back to profile fields,
// browser hints, metadata or another identity when that contract is unavailable.
export const requireSessionReviewContext = async (request, options) => {
  const { user, payload } = await requireSessionPayload(request, options)
  const record = payload?.user
  const id = record?.id || record?.user_id || record?.userId || record?._id
  if (!record || typeof id !== 'string' || id !== user.id ||
      !Object.hasOwn(record, 'role') || typeof record.role !== 'string' || !record.role.trim() || record.role.length > 50) {
    throw Object.assign(new Error('Catalogue review access could not be verified.'), { status: 503, code: 'ADMIN_AUTHORITY_UNAVAILABLE' })
  }
  // Explicit provider spellings only; never trim/case-fold a role into Admin.
  const role = ['Admin', 'admin'].includes(record.role) ? 'Admin' : 'User'
  return { user, roleRecord: { userId: user.id, role } }
}

export const __testables = {
  buildSessionHeaders,
  buildSessionUrl,
  configuredInstance,
  requireConfiguredInstance
}


