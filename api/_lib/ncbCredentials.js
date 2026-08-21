const normalise = (value) => typeof value === 'string' && value.trim() ? value.trim() : null

const entries = () => ({
  canonicalSecret: normalise(process.env.NCB_SECRET_KEY),
  canonicalApiKey: normalise(process.env.NCB_API_KEY),
  legacyApiKey: normalise(process.env.NOCODEBACKEND_API_KEY),
  legacySecret: normalise(process.env.NOCODEBACKEND_SECRET_KEY)
})

const firstConfigured = (values, aliases) => {
  for (const alias of aliases) {
    if (values[alias]) return { value: values[alias], source: alias }
  }
  return null
}

const missingCredential = (kind) => {
  const error = new Error(`NoCodeBackend ${kind} credential is not configured.`)
  error.status = 503
  error.code = kind === 'data' ? 'DATA_CREDENTIAL_MISSING' : 'AUTH_CREDENTIAL_MISSING'
  return error
}

export const resolveAuthCredential = () => {
  const resolved = firstConfigured(entries(), [
    'canonicalSecret',
    'legacySecret',
    'canonicalApiKey',
    'legacyApiKey'
  ])
  if (!resolved) throw missingCredential('auth')
  return resolved
}

// Recovered NoCodeBackend data-client evidence defines the generated-table
// credential chain as NCB_SECRET_KEY -> NCB_API_KEY -> NOCODEBACKEND_API_KEY.
// NOCODEBACKEND_SECRET_KEY remains an auth compatibility alias only and must
// not silently stand in for the table API credential.
export const resolveDataCredential = () => {
  const resolved = firstConfigured(entries(), [
    'canonicalSecret',
    'canonicalApiKey',
    'legacyApiKey'
  ])
  if (!resolved) throw missingCredential('data')
  return resolved
}

export const credentialSourceLabel = (source) => ({
  canonicalSecret: 'ncb-secret-key',
  canonicalApiKey: 'ncb-api-key',
  legacyApiKey: 'nocodebackend-api-key',
  legacySecret: 'nocodebackend-secret-key'
}[source] || 'missing')

export const credentialConfigurationState = () => {
  const values = entries()
  const auth = firstConfigured(values, ['canonicalSecret', 'legacySecret', 'canonicalApiKey', 'legacyApiKey'])
  const data = firstConfigured(values, ['canonicalSecret', 'canonicalApiKey', 'legacyApiKey'])
  return {
    authCredential: credentialSourceLabel(auth?.source),
    dataCredential: credentialSourceLabel(data?.source),
    authConfigured: Boolean(auth),
    dataConfigured: Boolean(data)
  }
}

export const __testables = { entries, firstConfigured }
