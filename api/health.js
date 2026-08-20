const DEFAULT_DATA_BASE_URL = 'https://api.nocodebackend.com'

const dataTransportState = () => {
  const configured = process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()
  if (!configured) return 'generated-table-api'
  try {
    const { hostname } = new URL(configured)
    if (hostname.includes('.lambda-url.') && hostname.endsWith('.on.aws')) return 'generated-table-api'
    if (hostname === 'api.nocodebackend.com') return 'generated-table-api'
    return 'custom-table-api'
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
      dataConfigured: Boolean(process.env.NOCODEBACKEND_SECRET_KEY) && dataTransport !== 'invalid',
      dataTransport,
      dataEndpoint: DEFAULT_DATA_BASE_URL,
      rateLimiterConfigured: Boolean(
        (process.env.pourfolio_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
        (process.env.pourfolio_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
      )
    }
  })
}

export const __testables = { dataTransportState }
