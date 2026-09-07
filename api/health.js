import { credentialConfigurationState } from './_lib/ncbCredentials.js'
import {
  CANONICAL_AUTH_BASE_URL,
  CANONICAL_DATA_BASE_URL,
  resolveAuthBaseUrl,
  resolveDataBaseUrl
} from './_lib/nocodeBackendConfig.js'
import { releaseProvenance } from './_lib/releaseProvenance.js'

const endpointState = (configuredValue, resolver, transport) => {
  const endpointConfigured = Boolean(configuredValue?.trim())
  try {
    resolver(configuredValue)
    return {
      transport,
      endpointConfigured,
      endpointValid: true,
      endpointCanonical: true
    }
  } catch {
    return {
      transport: 'invalid',
      endpointConfigured,
      endpointValid: false,
      endpointCanonical: false
    }
  }
}

const authTransportState = () => endpointState(
  process.env.NOCODEBACKEND_AUTH_BASE_URL,
  resolveAuthBaseUrl,
  'nocodebackend-auth'
)

const dataTransportState = () => endpointState(
  process.env.NOCODEBACKEND_DATA_BASE_URL,
  resolveDataBaseUrl,
  'nocodebackend-api'
)

const dataInstanceState = () => ({
  configured: Boolean(process.env.NOCODEBACKEND_INSTANCE?.trim())
})

export default function handler(_request, response) {
  const authState = authTransportState()
  const dataState = dataTransportState()
  const instanceState = dataInstanceState()
  const credentials = credentialConfigurationState()
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    status: 'ok',
    service: 'pourfolio',
    release: releaseProvenance(),
    checks: {
      authenticationConfigured: credentials.authConfigured && authState.endpointValid && instanceState.configured,
      dataConfigured: credentials.dataConfigured && dataState.endpointValid && instanceState.configured,
      authTransport: authState.transport,
      authEndpointConfigured: authState.endpointConfigured,
      authEndpointCanonical: authState.endpointCanonical,
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

export const __testables = {
  authTransportState,
  dataTransportState,
  dataInstanceState,
  CANONICAL_AUTH_BASE_URL,
  CANONICAL_DATA_BASE_URL
}
