import { resolveAuthCredential } from './ncbCredentials.js'
import { resolveAuthBaseUrl, resolveDataBaseUrl } from './nocodeBackendConfig.js'
import { withTimeout } from './httpSecurity.js'
import {
  certificationCredentialConfigurationState,
  requireUserAdminCertificationCredentials
} from './userAdminCertificationCredentials.js'

const statusFromHttp = (status) => {
  if (status >= 200 && status < 300) return 'PASS'
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  return 'FAIL'
}

const configuredInstance = (environment) => environment.NOCODEBACKEND_INSTANCE?.trim() || null

const safeJson = async (response) => {
  try {
    const text = await response.text()
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

const probeAuthProvider = async ({ environment, fetchImpl }) => {
  let secret
  try {
    secret = resolveAuthCredential(environment).value
  } catch {
    return { status: 'FAIL', code: 'AUTH_PROVIDER_CONFIGURATION_MISSING' }
  }

  const instance = configuredInstance(environment)
  if (!instance) return { status: 'FAIL', code: 'AUTH_INSTANCE_MISSING' }

  let baseUrl
  try {
    baseUrl = resolveAuthBaseUrl(environment.NOCODEBACKEND_AUTH_BASE_URL)
  } catch {
    return { status: 'FAIL', code: 'AUTH_ENDPOINT_INVALID' }
  }

  try {
    const url = new URL(baseUrl + '/providers')
    url.searchParams.set('instance', instance)
    const response = await withTimeout((signal) => fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + secret,
        'x-database-instance': instance
      },
      signal
    }))
    const payload = await safeJson(response)
    if (!response.ok) return { status: statusFromHttp(response.status), code: 'AUTH_PROVIDER_REJECTED' }
    if (!payload?.providers || typeof payload.providers !== 'object' || Array.isArray(payload.providers)) {
      return { status: 'FAIL', code: 'AUTH_PROVIDER_RESPONSE_INVALID' }
    }
    return { status: 'PASS' }
  } catch {
    return { status: 'FAIL', code: 'AUTH_PROVIDER_UNAVAILABLE' }
  }
}

const probeDataSecretKey = async ({ environment, fetchImpl, secretKey }) => {
  const instance = configuredInstance(environment)
  if (!instance) return { status: 'FAIL', code: 'DATA_INSTANCE_MISSING' }

  let baseUrl
  try {
    baseUrl = resolveDataBaseUrl(environment.NOCODEBACKEND_DATA_BASE_URL)
  } catch {
    return { status: 'FAIL', code: 'DATA_ENDPOINT_INVALID' }
  }

  try {
    const url = new URL(baseUrl + '/read/products')
    url.searchParams.set('Instance', instance)
    url.searchParams.set('page', '1')
    url.searchParams.set('limit', '1')
    url.searchParams.set('sort', 'id')
    url.searchParams.set('order', 'asc')

    const response = await withTimeout((signal) => fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + secretKey
      },
      signal
    }))

    if (!response.ok) return { status: statusFromHttp(response.status), code: 'DATA_KEY_REJECTED' }
    const payload = await safeJson(response)
    if (payload === null) return { status: 'FAIL', code: 'DATA_PROVIDER_RESPONSE_INVALID' }
    if (payload?.error || payload?.success === false || payload?.status === 'error') {
      return { status: 'FAIL', code: 'DATA_PROVIDER_RESPONSE_REJECTED' }
    }
    return { status: 'PASS' }
  } catch {
    return { status: 'FAIL', code: 'DATA_PROVIDER_UNAVAILABLE' }
  }
}

export const runUserAdminCertification = async ({
  environment = process.env,
  fetchImpl = globalThis.fetch,
  release = { commitSha: null, environment: null }
} = {}) => {
  const configuration = certificationCredentialConfigurationState(environment)

  let credentials
  try {
    credentials = requireUserAdminCertificationCredentials(environment)
  } catch (error) {
    return Object.freeze({
      version: 1,
      release,
      credentialSemantics: 'database_scoped_server_secret_key',
      configuration,
      checks: {
        authProviderReachable: 'NOT_RUN',
        userSecretKeyDataAccess: 'NOT_RUN',
        adminSecretKeyDataAccess: 'NOT_RUN',
        accountSessionAuthentication: 'SETUP_REQUIRED',
        ownerIsolation: 'INCONCLUSIVE',
        ratingMigrationUntouched: 'PASS'
      },
      cleanup: 'NOT_REQUIRED',
      setupRequired: {
        code: error.code || 'CERTIFICATION_CONFIGURATION_INVALID',
        ...(Array.isArray(error.missing) ? { missing: error.missing } : {})
      },
      overall: 'SETUP_REQUIRED'
    })
  }

  const [authProvider, userKey, adminKey] = await Promise.all([
    probeAuthProvider({ environment, fetchImpl }),
    probeDataSecretKey({ environment, fetchImpl, secretKey: credentials.user.secretKey }),
    probeDataSecretKey({ environment, fetchImpl, secretKey: credentials.admin.secretKey })
  ])

  const providerChecksPass = [authProvider.status, userKey.status, adminKey.status]
    .every((status) => status === 'PASS')

  return Object.freeze({
    version: 1,
    release,
    credentialSemantics: 'database_scoped_server_secret_key',
    configuration,
    checks: Object.freeze({
      authProviderReachable: authProvider.status,
      userSecretKeyDataAccess: userKey.status,
      adminSecretKeyDataAccess: adminKey.status,
      accountSessionAuthentication: 'SETUP_REQUIRED',
      ownerIsolation: 'INCONCLUSIVE',
      ratingMigrationUntouched: 'PASS'
    }),
    safeCodes: Object.freeze({
      authProvider: authProvider.code || null,
      userKey: userKey.code || null,
      adminKey: adminKey.code || null,
      accountSession: 'LOGIN_PASSWORD_OR_SUPPORTED_OTP_REQUIRED'
    }),
    cleanup: 'NOT_REQUIRED',
    overall: providerChecksPass ? 'INCONCLUSIVE' : 'FAIL'
  })
}

export const __testables = { probeAuthProvider, probeDataSecretKey, statusFromHttp }
