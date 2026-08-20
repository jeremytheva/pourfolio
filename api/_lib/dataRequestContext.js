import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

const requestOrigin = (request) => {
  const explicit = request?.headers?.origin
  if (explicit) return String(explicit)
  const host = request?.headers?.['x-forwarded-host'] || request?.headers?.host
  if (!host) return null
  const protocol = request?.headers?.['x-forwarded-proto'] || 'https'
  return `${protocol}://${host}`
}

export const withDataRequestContext = (request, callback) => storage.run({
  cookie: request?.headers?.cookie || '',
  origin: requestOrigin(request)
}, callback)

export const getDataRequestContext = () => storage.getStore() || { cookie: '', origin: null }

export const __testables = { requestOrigin }
