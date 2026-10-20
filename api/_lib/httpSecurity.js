const rateLimitBuckets = new Map()
export const MAX_RATE_LIMIT_BUCKETS = 5_000

export const MAX_REQUEST_BYTES = 32 * 1024
export const UPSTREAM_TIMEOUT_MS = 10_000

export const getClientAddress = (request, environment = process.env) => {
  // Only Vercel's runtime guarantees that its edge overwrites this header.
  // Standard Node hosts must use the socket peer, even if a client sends it.
  const forwarded = environment.VERCEL === '1' ? request.headers?.['x-vercel-forwarded-for'] : undefined
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return String(address || request.socket?.remoteAddress || 'unknown').split(',')[0].trim() || 'unknown'
}

const cleanRateLimitBuckets = (now) => {
  for (const [bucketKey, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey)
  }
  while (rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS) {
    rateLimitBuckets.delete(rateLimitBuckets.keys().next().value)
  }
}

export const enforceRateLimit = (request, response, {
  key = 'default',
  limit = 120,
  windowMs = 60_000
} = {}) => {
  const now = Date.now()
  cleanRateLimitBuckets(now)
  const bucketKey = `${key}:${getClientAddress(request)}`
  const current = rateLimitBuckets.get(bucketKey)

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
    response.setHeader('X-RateLimit-Limit', String(limit))
    response.setHeader('X-RateLimit-Remaining', String(limit - 1))
    return true
  }

  current.count += 1
  response.setHeader('X-RateLimit-Limit', String(limit))
  response.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - current.count)))

  if (current.count <= limit) return true

  response.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
  response.status(429).json({ error: 'Too many requests. Please try again shortly.' })
  return false
}

export const requestBodySize = (request) => {
  const contentLength = Number(request.headers?.['content-length'])
  if (Number.isFinite(contentLength)) return contentLength
  if (request.body === undefined || request.body === null) return 0
  if (Buffer.isBuffer(request.body)) return request.body.byteLength
  if (typeof request.body === 'string') return Buffer.byteLength(request.body)
  return Buffer.byteLength(JSON.stringify(request.body))
}

export const enforceRequestSize = (request, response, maxBytes = MAX_REQUEST_BYTES) => {
  if (requestBodySize(request) <= maxBytes) return true
  response.status(413).json({ error: 'Request body is too large.' })
  return false
}

const normaliseHost = (value) => String(value || '').trim().toLowerCase()

export const isSameOriginRequest = (request, allowedOrigins = process.env.ALLOWED_ORIGINS || '') => {
  const origin = request.headers?.origin
  if (!origin) return true

  try {
    const originUrl = new URL(origin)
    const requestHost = normaliseHost(request.headers?.['x-forwarded-host'] || request.headers?.host)
    if (normaliseHost(originUrl.host) === requestHost) return true

    return allowedOrigins
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .includes(originUrl.origin)
  } catch {
    return false
  }
}

export const enforceOrigin = (request, response) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) || isSameOriginRequest(request)) return true
  response.status(403).json({ error: 'Request origin is not allowed.' })
  return false
}

export const withTimeout = async (operation, timeoutMs = UPSTREAM_TIMEOUT_MS, outerSignal) => {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(outerSignal.reason)
  if (outerSignal?.aborted) abortFromCaller()
  else outerSignal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    controller.signal.throwIfAborted()
    const result = await operation(controller.signal)
    controller.signal.throwIfAborted()
    return result
  } finally {
    clearTimeout(timeout)
    outerSignal?.removeEventListener('abort', abortFromCaller)
  }
}

export const safeErrorMessage = (status) => {
  if (status === 400) return 'The request was not valid.'
  if (status === 401) return 'Authentication is required.'
  if (status === 403) return 'You are not authorised to perform this action.'
  if (status === 404) return 'The requested record was not found.'
  if (status === 409) return 'The request conflicts with the current record state.'
  if (status === 429) return 'Too many requests. Please try again shortly.'
  return 'The upstream service could not complete the request.'
}

export const __resetRateLimitsForTests = () => rateLimitBuckets.clear()
export const __rateLimitBucketCountForTests = () => rateLimitBuckets.size

