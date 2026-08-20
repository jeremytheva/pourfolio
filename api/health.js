const dataTransportState = () => {
  const baseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL
  if (!baseUrl) return 'missing'
  try {
    const { hostname } = new URL(baseUrl)
    if (hostname.includes('.lambda-url.') && hostname.endsWith('.on.aws')) return 'legacy-proxy'
    return 'direct-v2'
  } catch {
    return 'invalid'
  }
}

export default function handler(_request, response) {
  const dataTransport = dataTransportState()
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'pourfolio',
    checks: {
      authenticationConfigured: Boolean(process.env.NOCODEBACKEND_SECRET_KEY),
      dataConfigured: dataTransport === 'direct-v2',
      dataTransport,
      rateLimiterConfigured: Boolean(
        (process.env.pourfolio_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
        (process.env.pourfolio_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
      )
    }
  })
}

export const __testables = { dataTransportState }
