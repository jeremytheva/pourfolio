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

export const resolveRedisRestConfig = (environment = process.env) => ({
  url: environment.pourfolio_KV_REST_API_URL || environment.UPSTASH_REDIS_REST_URL || '',
  token: environment.pourfolio_KV_REST_API_TOKEN || environment.UPSTASH_REDIS_REST_TOKEN || ''
})

export const createRedisClientAccessor = ({
  environment = process.env,
  createClient = ({ url, token }) => new Redis({ url, token })
} = {}) => {
  let productionRedis

  return (injectedClient) => {
    if (injectedClient) {
      if (typeof injectedClient.eval !== 'function') {
        throw new RedisError(REDIS_ERROR_CODES.CLIENT_INVALID)
      }
      return injectedClient
    }

    const config = resolveRedisRestConfig(environment)
    if (!config.url || !config.token) {
      throw new RedisError(REDIS_ERROR_CODES.CONFIGURATION_MISSING)
    }

    try {
      productionRedis ||= createClient(config)
    } catch (error) {
      throw new RedisError(REDIS_ERROR_CODES.CONNECTION_FAILED, { cause: error })
    }
    return productionRedis
  }
}

export const getRedisClient = createRedisClientAccessor()
