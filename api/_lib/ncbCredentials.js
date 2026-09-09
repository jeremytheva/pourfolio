const normalise = (value) => typeof value === 'string' && value.trim() ? value.trim() : null

const entries = (environment = process.env) => ({
  authSecret: normalise(environment.NOCODEBACKEND_AUTH_SECRET_KEY),
  dataSecret: normalise(environment.NOCODEBACKEND_SECRET_KEY)
})

const missingCredential = (kind) => {
  const error = new Error(`NoCodeBackend ${kind} credential is not configured.`)
  error.status = 503
  error.code = kind === 'data' ? 'DATA_CREDENTIAL_MISSING' : 'AUTH_CREDENTIAL_MISSING'
  return error
}

const resolveCredential = (kind, environment = process.env) => {
  const configured = entries(environment)
  const value = kind === 'auth' ? configured.authSecret : configured.dataSecret
  if (!value) throw missingCredential(kind)
  return {
    value,
    source: kind === 'auth' ? 'nocodebackend-auth-secret-key' : 'nocodebackend-secret-key'
  }
}

export const resolveAuthCredential = (environment = process.env) => resolveCredential('auth', environment)
export const resolveDataCredential = (environment = process.env) => resolveCredential('data', environment)

export const credentialSourceLabel = (source) => source || 'missing'

export const credentialConfigurationState = (environment = process.env) => {
  const configured = entries(environment)
  const authConfigured = Boolean(configured.authSecret)
  const dataConfigured = Boolean(configured.dataSecret)
  return {
    authCredential: authConfigured ? 'nocodebackend-auth-secret-key' : 'missing',
    dataCredential: dataConfigured ? 'nocodebackend-secret-key' : 'missing',
    authConfigured,
    dataConfigured
  }
}

export const __testables = { entries }
