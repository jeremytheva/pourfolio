import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

const extractAuthCookies = (cookieHeader = '') => String(cookieHeader)
  .split(';')
  .map((cookie) => cookie.trim())
  .filter(Boolean)
  .filter((cookie) => {
    const name = cookie.split('=', 1)[0]
    return name === 'better-auth.session_token' ||
      name === 'better-auth.session_data' ||
      name === '__Secure-better-auth.session_token' ||
      name === '__Secure-better-auth.session_data' ||
      name === '__Host-better-auth.session_token' ||
      name === '__Host-better-auth.session_data'
  })
  .join('; ')

const requestOrigin = (request) => {
  const origin = request?.headers?.origin
  if (origin) {
    try { return new URL(String(origin)).origin } catch { /* fall through */ }
  }

  const host = request?.headers?.['x-forwarded-host'] || request?.headers?.host
  if (!host) return ''
  const proto = request?.headers?.['x-forwarded-proto'] || 'https'
  try { return new URL(`${proto}://${host}`).origin } catch { return '' }
}

export const runWithDataRequestContext = (request, fn) => {
  const origin = requestOrigin(request)
  return storage.run({
    cookie: extractAuthCookies(request?.headers?.cookie || ''),
    origin,
    referer: origin ? `${origin}/` : ''
  }, fn)
}

export const getDataRequestContext = () => storage.getStore() || {}

export const __testables = { extractAuthCookies, requestOrigin }
