import { credentialConfigurationState } from './_lib/ncbCredentials.js'
import { releaseProvenance } from './_lib/releaseProvenance.js'

const CANONICAL_DATA_BASE_URL = 'https://api.nocodebackend.com/'

const dataTransportState = () => {
  const configured = process.env.NOCODEBACKEND_DATA_BASE_URL?.trim() || CANONICAL_DATA_BASE_URL
  try {
    const url = new URL(configured)
    return {
      transport: 'nocodebackend-api',
      endpointConfigured: Boolean(process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()),
      endpointValid: true,
      endpointCanonical: url.toString() === CANONICAL_DATA_BASE_URL
    }
  } catch {
    return {
      transport: 'invalid',
      endpointConfigured: Boolean(process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()),
      endpointValid: false,
      endpointCanonical: false
    }
  }
}

const dataInstanceState = () => ({
  configured: Boolean(process.env.NOCODEBACKEND_INSTANCE?.trim())
})

export default function handler(_request, response) {
  const dataState = dataTransportState()
  const instanceState = dataInstanceState()
  const credentials = credentialConfigurationState()
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'pourfolio',
    release: releaseProvenance(),
    checks: {
      authenticationConfigured: credentials.authConfigured && instanceState.configured,
      dataConfigured: credentials.dataConfigured && dataState.endpointValid && instanceState.configured,
      dataTransport: dataState.transport,
      dataEndpointConfigured: dataState.endpointConfigured,
      dataEndpointCanonical: dataState.endpointCanonical,
      authCredentialSource: credentials.authCredential,
      dataCredentialSource: credentials.dataCredential,
      instanceConfigured: instanceState.configured,
      rateLimiterConfigured: Boolean(
        (process.env.pourfolio_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
        (process.env.pourfolio_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
      )
    }
  })
}

export const __testables = { dataTransportState, dataInstanceState, CANONICAL_DATA_BASE_URL }
