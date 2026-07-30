import { Redis } from '@upstash/redis'

export const REDIS_ERROR_CODES = Object.freeze({
  CONFIGURATION_MISSING: 'REDIS_CONFIGURATION_MISSING',
  CLIENT_INVALID: 'REDIS_CLIENT_INVALID',
  CONNECTION_FAILED: 'REDIS_CONNECTION_FAILED',
  COMMAND_FAILED: 'REDIS_COMMAND_FAILED',
  RESULT_INVALID: 'REDIS_RESULT_INVALID'
})

export class RedisError extends Error {
  constructor(code, options) {
    super('Redis operation failed', options)
    this.name = 'RedisError'
    this.code = code
  }
}

let productionRedis

export const getRedisClient = (injectedClient) => {
  if (injectedClient) {
    if (typeof injectedClient.eval !== 'function') {
      throw new RedisError(REDIS_ERROR_CODES.CLIENT_INVALID)
    }
    return injectedClient
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new RedisError(REDIS_ERROR_CODES.CONFIGURATION_MISSING)
  }

  try {
    productionRedis ||= Redis.fromEnv()
  } catch (error) {
    throw new RedisError(REDIS_ERROR_CODES.CONNECTION_FAILED, { cause: error })
  }
  return productionRedis
}
