export const createInMemoryRedis = ({ initialTime = 0 } = {}) => {
  const buckets = new Map()
  let currentTime = initialTime

  return {
    advanceTime(milliseconds) {
      currentTime += milliseconds
    },

    async eval(_script, keys, args) {
      if (keys.length !== 1 || args.length !== 1) {
        throw new Error('The rate-limit test double only supports one key and one TTL argument')
      }

      const [key] = keys
      const windowMs = Number(args[0])
      const existing = buckets.get(key)
      const bucket = existing && existing.expiresAt > currentTime
        ? existing
        : { count: 0, expiresAt: currentTime + windowMs }

      bucket.count += 1
      buckets.set(key, bucket)

      return [bucket.count, bucket.expiresAt - currentTime]
    }
  }
}
