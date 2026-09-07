export const CANONICAL_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
export const CANONICAL_DATA_BASE_URL = 'https://api.nocodebackend.com/'

const normaliseBaseUrl = (value) => new URL(value).toString().replace(/\/+$/, '')

const resolveCanonicalBaseUrl = (configuredValue, canonicalValue, { code, message }) => {
  const candidate = configuredValue?.trim() || canonicalValue
  let normalised

  try {
    normalised = normaliseBaseUrl(candidate)
  } catch {
    const error = new Error(message)
    error.status = 503
    error.code = code
    throw error
  }

  if (normalised !== normaliseBaseUrl(canonicalValue)) {
    const error = new Error(message)
    error.status = 503
    error.code = code
    throw error
  }

  return normalised
}

export const resolveAuthBaseUrl = (configuredValue = process.env.NOCODEBACKEND_AUTH_BASE_URL) => (
  resolveCanonicalBaseUrl(configuredValue, CANONICAL_AUTH_BASE_URL, {
    code: 'AUTH_CONFIGURATION_INVALID',
    message: 'The authentication service endpoint is invalid.'
  })
)

export const resolveDataBaseUrl = (configuredValue = process.env.NOCODEBACKEND_DATA_BASE_URL) => (
  resolveCanonicalBaseUrl(configuredValue, CANONICAL_DATA_BASE_URL, {
    code: 'DATA_CONFIGURATION_INVALID',
    message: 'The production data service endpoint is invalid.'
  })
)

export const __testables = { normaliseBaseUrl, resolveCanonicalBaseUrl }
