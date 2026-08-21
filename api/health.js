import { credentialConfigurationState } from './_lib/ncbCredentials.js'

const CANONICAL_DATA_BASE_URL = 'https://app.nocodebackend.com/api/data'

const canonicalDataUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === 'https://app.nocodebackend.com' && url.pathname.replace(/\/+$/, '') === '/api/data'
  } catch {
    return false
  }
}

const looksLikeLegacyLambdaProxy = (value) => {
  try {
    const { hostname } = new URL(value)
    return hostname.includes('.lambda-url.') && hostname.endsWith('.on.aws')
  } catch {
    return false
  }
}

const dataTransportState = () => {
  const configured = process.env.NCB_DATA_API_URL?.trim() || process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()
  if (!configured || canonicalDataUrl(configured) || looksLikeLegacyLambdaProxy(configured)) {
    return { transport: 'generated-table-api', override: configured && !canonicalDataUrl(configured) ? 'ignored' : 'none' }
  }

  if (process.env.NCB_ALLOW_CUSTOM_DATA_API !== '1') {
    return { transport: 'generated-table-api', override: 'ignored' }
  }

  try {
    new URL(configured)
    return { transport: 'custom-table-api', override: 'accepted' }
  } catch {
    return { transport: 'invalid', override: 'invalid' }
  }
}

const secretAliasState = () => {
  const canonical = process.env.NCB_SECRET_KEY?.trim()
  const legacy = process.env.NOCODEBACKEND_SECRET_KEY?.trim()
  if (!canonical && !legacy) return 'missing'
  if (canonical && !legacy) return 'canonical-only'
  if (!canonical && legacy) return 'legacy-only'
  return canonical === legacy ? 'aligned' : 'conflicting'
}

export default function handler(_request, response) {
  const dataState = dataTransportState()
  const credentials = credentialConfigurationState()
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'pourfolio',
    checks: {
      authenticationConfigured: credentials.authConfigured,
      dataConfigured: credentials.dataConfigured && dataState.transport !== 'invalid',
      dataTransport: dataState.transport,
      dataOverride: dataState.override,
      secretAliasState: secretAliasState(),
      authCredentialSource: credentials.authCredential,
      dataCredentialSource: credentials.dataCredential,
      rateLimiterConfigured: Boolean(
        (process.env.pourfolio_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
        (process.env.pourfolio_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
      )
    }
  })
}

export const __testables = { dataTransportState, secretAliasState, canonicalDataUrl, CANONICAL_DATA_BASE_URL }
