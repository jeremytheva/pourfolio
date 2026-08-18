import { withTimeout } from './httpSecurity.js'

const DEFAULT_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'

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

export const requireSessionUser = async (request) => {
  const secret = process.env.NOCODEBACKEND_SECRET_KEY
  if (!secret) {
    const error = new Error('Server authentication is not configured.')
    error.status = 503
    throw error
  }

  const authBaseUrl = (process.env.NOCODEBACKEND_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL).replace(/\/+$/, '')
  const upstream = await withTimeout((signal) => fetch(`${authBaseUrl}/get-session`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${secret}`,
      cookie: request.headers?.cookie || ''
    },
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