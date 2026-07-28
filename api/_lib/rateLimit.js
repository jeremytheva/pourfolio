import crypto from 'node:crypto'
import { getClientAddress } from './httpSecurity.js'

const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`

export const AUTH_RATE_LIMITS = Object.freeze({
  'sign-in/email': { name: 'signin', limit: 10, windowMs: 15 * 60_000, account: true },
  'sign-in/otp': { name: 'signin-otp', limit: 10, windowMs: 15 * 60_000, account: true },
  'verify-otp': { name: 'verify-otp', limit: 8, windowMs: 15 * 60_000, account: true },
  'sign-up/email': { name: 'signup', limit: 5, windowMs: 60 * 60_000, account: true }
})

export const normaliseAccountIdentifier = (value) => {
  if (typeof value !== 'string') return ''
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-AU').slice(0, 320)
}

const accountFromRequest = (request) => {
  let body = request.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return '' }
  }
  return normaliseAccountIdentifier(body?.email || body?.identifier)
}

const opaqueKey = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url')

export const rateLimitPolicyFor = (path) => AUTH_RATE_LIMITS[path] || {
  name: 'general', limit: 120, windowMs: 60_000, account: false
}

export const buildSharedRateLimitKey = (request, path, secret) => {
  const policy = rateLimitPolicyFor(path)
  const address = getClientAddress(request)
  const account = policy.account ? accountFromRequest(request) : ''
  return `pourfolio:auth:${policy.name}:${opaqueKey(`${address}\0${account}`, secret)}`
}

export const checkSharedRateLimit = async (request, path, {
  url = process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.UPSTASH_REDIS_REST_TOKEN,
  keySecret = process.env.RATE_LIMIT_KEY_SECRET,
  fetchImpl = fetch
} = {}) => {
  if (!url || !token || !keySecret) throw new Error('Shared rate limiter is not configured')
  const policy = rateLimitPolicyFor(path)
  const key = buildSharedRateLimitKey(request, path, keySecret)
  const result = await fetchImpl(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(['EVAL', INCREMENT_SCRIPT, '1', key, String(policy.windowMs)])
  })
  if (!result.ok) throw new Error(`Shared rate limiter returned ${result.status}`)
  const payload = await result.json()
  if (!Array.isArray(payload.result) || payload.result.length !== 2) {
    throw new Error('Shared rate limiter returned an invalid response')
  }
  const count = Number(payload.result[0])
  const ttlMs = Number(payload.result[1])
  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) throw new Error('Shared rate limiter returned invalid values')
  return { allowed: count <= policy.limit, count, ttlMs, ...policy }
}

export const enforceSharedRateLimit = async (request, response, path, options) => {
  try {
    const decision = await checkSharedRateLimit(request, path, options)
    response.setHeader('X-RateLimit-Limit', String(decision.limit))
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, decision.limit - decision.count)))
    if (decision.allowed) return true
    response.setHeader('Retry-After', String(Math.max(1, Math.ceil(decision.ttlMs / 1000))))
    response.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    return false
  } catch (error) {
    console.error('Shared authentication rate limiter unavailable', { name: error.name })
    response.status(503).json({ error: 'Authentication is temporarily unavailable.' })
    return false
  }
}
