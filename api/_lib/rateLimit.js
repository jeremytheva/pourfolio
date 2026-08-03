import crypto from 'node:crypto'
import { getClientAddress } from './httpSecurity.js'
import { REDIS_ERROR_CODES, RedisError, getRedisClient } from './redis.js'

const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`

export const RATE_LIMIT_ERROR_CODES = Object.freeze({
  CONFIGURATION_MISSING: 'RATE_LIMIT_CONFIGURATION_MISSING'
})

export class RateLimitError extends Error {
  constructor(code) {
    super('Shared rate limiter failed')
    this.name = 'RateLimitError'
    this.code = code
  }
}

const safeFailureCategory = (error) => {
  if (error?.code === RATE_LIMIT_ERROR_CODES.CONFIGURATION_MISSING ||
      error?.code === REDIS_ERROR_CODES.CONFIGURATION_MISSING ||
      error?.code === REDIS_ERROR_CODES.CLIENT_INVALID) return 'configuration'
  if (error?.code === REDIS_ERROR_CODES.CONNECTION_FAILED) return 'sdk_connection'
  if (error?.code === REDIS_ERROR_CODES.COMMAND_FAILED) return 'sdk_command'
  if (error?.code === REDIS_ERROR_CODES.RESULT_INVALID) return 'invalid_result'
  return 'unknown'
}

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
  redis,
  keySecret = process.env.RATE_LIMIT_KEY_SECRET
} = {}) => {
  if (!keySecret) throw new RateLimitError(RATE_LIMIT_ERROR_CODES.CONFIGURATION_MISSING)
  const policy = rateLimitPolicyFor(path)
  const key = buildSharedRateLimitKey(request, path, keySecret)
  let result
  try {
    result = await getRedisClient(redis).eval(INCREMENT_SCRIPT, [key], [String(policy.windowMs)])
  } catch (error) {
    if (error instanceof RedisError) throw error
    throw new RedisError(REDIS_ERROR_CODES.COMMAND_FAILED, { cause: error })
  }
  if (!Array.isArray(result) || result.length !== 2) {
    throw new RedisError(REDIS_ERROR_CODES.RESULT_INVALID)
  }
  const count = Number(result[0])
  const ttlMs = Number(result[1])
  // PTTL returns negative sentinel values when the bucket has no usable expiry.
  // Treat those, fractional values and non-positive counters as a provider
  // contract failure rather than accidentally allowing an unbounded bucket.
  if (!Number.isSafeInteger(count) || count < 1 ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > policy.windowMs) {
    throw new RedisError(REDIS_ERROR_CODES.RESULT_INVALID)
  }
  return { allowed: count <= policy.limit, count, ttlMs, ...policy }
}

export const enforceSharedRateLimit = async (request, response, path, options) => {
  const requestId = options?.requestId
  try {
    const decision = await checkSharedRateLimit(request, path, options)
    response.setHeader('X-RateLimit-Limit', String(decision.limit))
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, decision.limit - decision.count)))
    if (decision.allowed) return true
    response.setHeader('Retry-After', String(Math.max(1, Math.ceil(decision.ttlMs / 1000))))
    response.status(429).json({
      error: 'Too many requests. Please try again shortly.',
      ...(requestId ? { requestId } : {})
    })
    return false
  } catch (error) {
    console.error('Shared authentication rate limiter unavailable', {
      category: safeFailureCategory(error),
      ...(requestId ? { requestId } : {})
    })
    response.status(503).json({
      error: 'Authentication is temporarily unavailable.',
      ...(requestId ? { requestId } : {})
    })
    return false
  }
}
