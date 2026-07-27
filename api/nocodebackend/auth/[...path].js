import crypto from 'node:crypto'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage,
  withTimeout
} from '../../_lib/httpSecurity.js'

const DEFAULT_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
const AUTH_ACTIONS = Object.freeze({
  providers: ['GET'],
  'get-session': ['GET'],
  'sign-up/email': ['POST'],
  'sign-in/email': ['POST'],
  'sign-in/otp': ['POST'],
  'verify-otp': ['POST'],
  'sign-in/google': ['GET'],
  'sign-out': ['POST']
})

const getRequestPath = (request) => {
  const path = request.query?.path
  const segments = Array.isArray(path) ? path : path ? String(path).split('/') : []
  return segments.filter(Boolean).join('/')
}

const getRequestBody = (request) => {
  if (['GET', 'HEAD'].includes(request.method) || request.body === undefined || request.body === null) {
    return undefined
  }
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) return request.body
  return JSON.stringify(request.body)
}

const safeRedirectTarget = (request, value) => {
  if (!value) return null

  try {
    const target = new URL(String(value))
    const requestHost = String(request.headers?.['x-forwarded-host'] || request.headers?.host || '').toLowerCase()
    return target.host.toLowerCase() === requestHost ? target.origin : null
  } catch {
    return null
  }
}

const buildUpstreamUrl = (request, path) => {
  const baseUrl = (process.env.NOCODEBACKEND_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL).replace(/\/+$/, '')
  const url = new URL(`${baseUrl}/${path.split('/').map(encodeURIComponent).join('/')}`)

  if (path === 'sign-in/google') {
    const redirectTo = safeRedirectTarget(request, request.query?.redirectTo)
    if (redirectTo) url.searchParams.set('redirectTo', redirectTo)
  }

  return url
}

const splitSetCookieHeader = (header) => String(header || '')
  .split(/,(?=\s*[^;,\s]+=)/)
  .map((cookie) => cookie.trim())
  .filter(Boolean)

const secureCookie = (cookie) => {
  const [nameValue, ...rawAttributes] = String(cookie).split(';')
  const attributes = []
  let sameSite = null

  for (const rawAttribute of rawAttributes) {
    const attribute = rawAttribute.trim()
    if (!attribute) continue

    const attributeName = attribute.split('=', 1)[0].toLowerCase()
    if (attributeName === 'domain' || attributeName === 'path') continue
    if (attributeName === 'httponly' || attributeName === 'secure') continue
    if (attributeName === 'samesite') {
      sameSite = attribute
      continue
    }
    attributes.push(attribute)
  }

  return [
    nameValue.trim(),
    ...attributes,
    'Path=/',
    'HttpOnly',
    'Secure',
    sameSite || 'SameSite=Lax'
  ].join('; ')
}

const getSetCookies = (headers) => {
  const cookies = headers.getSetCookie?.()
  if (Array.isArray(cookies) && cookies.length) return cookies
  return splitSetCookieHeader(headers.get('set-cookie'))
}

const copyResponseHeaders = (upstream, response) => {
  const contentType = upstream.headers.get('content-type')
  const location = upstream.headers.get('location')
  if (contentType) response.setHeader('Content-Type', contentType)
  if (location) response.setHeader('Location', location)
  response.setHeader('Cache-Control', 'no-store')

  const cookies = getSetCookies(upstream.headers)
  if (cookies.length) {
    response.setHeader('Set-Cookie', cookies.map(secureCookie))
  }
}

const rateLimitForAction = (path) => {
  if (path.startsWith('sign-in') || path === 'verify-otp') {
    return { key: `auth:${path}`, limit: 20, windowMs: 15 * 60_000 }
  }
  if (path === 'sign-up/email') {
    return { key: 'auth:signup', limit: 10, windowMs: 60 * 60_000 }
  }
  return { key: `auth:${path}`, limit: 120, windowMs: 60_000 }
}

export default async function handler(request, response) {
  const correlationId = request.headers?.['x-request-id'] || crypto.randomUUID()
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')

  const secret = process.env.NOCODEBACKEND_SECRET_KEY
  if (!secret) {
    response.status(503).json({ error: 'Authentication is not configured.', requestId: correlationId })
    return
  }

  const path = getRequestPath(request)
  const methods = AUTH_ACTIONS[path]
  if (!methods) {
    response.status(404).json({ error: 'Authentication action not found.', requestId: correlationId })
    return
  }
  if (!methods.includes(request.method)) {
    response.setHeader('Allow', methods.join(', '))
    response.status(405).json({ error: 'Method not allowed.', requestId: correlationId })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, rateLimitForAction(path))) return

  try {
    const upstream = await withTimeout((signal) => fetch(buildUpstreamUrl(request, path), {
      method: request.method,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${secret}`,
        cookie: request.headers?.cookie || '',
        ...(getRequestBody(request) === undefined ? {} : { 'content-type': 'application/json' })
      },
      body: getRequestBody(request),
      redirect: 'manual',
      signal
    }))

    copyResponseHeaders(upstream, response)

    if (upstream.status >= 300 && upstream.status < 400) {
      response.status(upstream.status).end()
      return
    }

    const body = await upstream.arrayBuffer()
    if (!upstream.ok) {
      response.status(upstream.status).json({
        error: safeErrorMessage(upstream.status),
        requestId: correlationId
      })
      return
    }

    response.status(upstream.status).send(Buffer.from(body))
  } catch (error) {
    console.error('Authentication proxy error', {
      correlationId,
      name: error.name
    })
    response.status(502).json({
      error: 'Authentication service is temporarily unavailable.',
      requestId: correlationId
    })
  }
}

export const __testables = {
  AUTH_ACTIONS,
  getRequestPath,
  safeRedirectTarget,
  splitSetCookieHeader,
  secureCookie
}
