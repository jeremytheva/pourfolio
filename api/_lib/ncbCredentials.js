const normalise = (value) => typeof value === 'string' && value.trim() ? value.trim() : null

const entries = () => ({
  canonicalSecret: normalise(process.env.NCB_SECRET_KEY),
  canonicalApiKey: normalise(process.env.NCB_API_KEY),
  legacyApiKey: normalise(process.env.NOCODEBACKEND_API_KEY),
  legacySecret: normalise(process.env.NOCODEBACKEND_SECRET_KEY)
})

const uniqueValues = (values) => [...new Set(values.filter(Boolean))]

export const credentialState = () => {
  const values = entries()
  const configured = Object.entries(values).filter(([, value]) => value)
  const distinct = uniqueValues(configured.map(([, value]) => value))

  return {
    configuredAliases: configured.map(([name]) => name),
    conflict: distinct.length > 1,
    missing: configured.length === 0
  }
}

const resolve = (orderedAliases) => {
  const values = entries()
  const state = credentialState()
  if (state.conflict) {
    const error = new Error('NoCodeBackend credential configuration is inconsistent.')
    error.status = 503
    error.code = 'NCB_CREDENTIAL_CONFLICT'
    throw error
  }

  for (const alias of orderedAliases) {
    if (values[alias]) return { value: values[alias], source: alias }
  }

  const error = new Error('NoCodeBackend credential is not configured.')
  error.status = 503
  error.code = 'NCB_CREDENTIAL_MISSING'
  throw error
}

export const resolveAuthCredential = () => resolve([
  'canonicalSecret',
  'legacySecret',
  'canonicalApiKey',
  'legacyApiKey'
])

export const resolveDataCredential = () => resolve([
  'canonicalSecret',
  'canonicalApiKey',
  'legacyApiKey',
  'legacySecret'
])

export const credentialSourceLabel = (source) => ({
  canonicalSecret: 'ncb-secret-key',
  canonicalApiKey: 'ncb-api-key',
  legacyApiKey: 'nocodebackend-api-key',
  legacySecret: 'nocodebackend-secret-key'
}[source] || 'missing')

export const __testables = { entries, uniqueValues }
