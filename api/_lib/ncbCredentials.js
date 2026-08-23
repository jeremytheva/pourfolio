const normalise = (value) => typeof value === 'string' && value.trim() ? value.trim() : null

const entries = (environment = process.env) => ({
  secret: normalise(environment.NOCODEBACKEND_SECRET_KEY)
})

const missingCredential = (kind) => {
  const error = new Error(`NoCodeBackend ${kind} credential is not configured.`)
  error.status = 503
  error.code = kind === 'data' ? 'DATA_CREDENTIAL_MISSING' : 'AUTH_CREDENTIAL_MISSING'
  return error
}

const resolveCredential = (kind, environment = process.env) => {
  const value = entries(environment).secret
  if (!value) throw missingCredential(kind)
  return { value, source: 'nocodebackend-secret-key' }
}

export const resolveAuthCredential = (environment = process.env) => resolveCredential('auth', environment)
export const resolveDataCredential = (environment = process.env) => resolveCredential('data', environment)

export const credentialSourceLabel = (source) => source || 'missing'

export const credentialConfigurationState = (environment = process.env) => {
  const configured = Boolean(entries(environment).secret)
  return {
    authCredential: configured ? 'nocodebackend-secret-key' : 'missing',
    dataCredential: configured ? 'nocodebackend-secret-key' : 'missing',
    authConfigured: configured,
    dataConfigured: configured
  }
}

export const __testables = { entries }
