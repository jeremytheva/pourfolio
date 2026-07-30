import { Redis } from '@upstash/redis'

const productionRedis = Redis.fromEnv()

export const getRedisClient = (injectedClient) => {
  if (injectedClient) {
    if (typeof injectedClient.eval !== 'function') throw new Error('Injected Redis client is invalid')
    return injectedClient
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Redis is not configured')
  }

  return productionRedis
}
