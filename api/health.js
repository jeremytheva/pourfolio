const dataTransportState = () => {
  const configured = process.env.NCB_DATA_API_URL?.trim() || process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()
  if (!configured) return 'generated-table-api'
  try {
    const { hostname, pathname } = new URL(configured)
    if (hostname.includes('.lambda-url.') && hostname.endsWith('.on.aws')) return 'generated-table-api'
    if (hostname === 'app.nocodebackend.com' && pathname.replace(/\/+$/, '') === '/api/data') return 'generated-table-api'
    return 'custom-table-api'
  } catch {
    return 'invalid'
  }
}

export default function handler(_request, response) {
  const dataTransport = dataTransportState()
  const secretConfigured = Boolean(process.env.NCB_SECRET_KEY || process.env.NOCODEBACKEND_SECRET_KEY)
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'pourfolio',
    checks: {
      authenticationConfigured: secretConfigured,
      dataConfigured: secretConfigured && dataTransport !== 'invalid',
      dataTransport,
      rateLimiterConfigured: Boolean(
        (process.env.pourfolio_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
        (process.env.pourfolio_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
      )
    }
  })
}

export const __testables = { dataTransportState }
