export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'pourfolio',
    checks: {
      authenticationConfigured: Boolean(process.env.NOCODEBACKEND_SECRET_KEY),
      dataConfigured: Boolean(process.env.NOCODEBACKEND_DATA_BASE_URL),
      rateLimiterConfigured: Boolean(
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN &&
        process.env.RATE_LIMIT_KEY_SECRET
      )
    }
  })
}
