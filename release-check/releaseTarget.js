const POURFOLIO_VERCEL_HOST = /^pourfolio(?:-[a-z0-9-]+)?-jeremythevas-projects\.vercel\.app$/
const RELEASE_SHA = /^[0-9a-f]{40}$/
const RELEASE_ENVIRONMENTS = new Set(['preview', 'production'])

const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype
)

export const parseReleaseSha = (value) => {
  if (typeof value !== 'string' || !RELEASE_SHA.test(value)) {
    throw new Error('Release SHA is invalid.')
  }
  return value
}

export const parseReleaseBaseUrl = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Release URL is invalid.')
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Release URL is invalid.')
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !POURFOLIO_VERCEL_HOST.test(url.hostname)
  ) {
    throw new Error('Release URL is not an approved Pourfolio deployment origin.')
  }

  return url.origin
}

export const validateReadinessPayload = (payload, expectedSha) => {
  parseReleaseSha(expectedSha)
  if (!isPlainObject(payload) || !isPlainObject(payload.release) || !isPlainObject(payload.checks)) {
    throw new Error('Release readiness response is invalid.')
  }
  if (
    payload.status !== 'ready' ||
    payload.release.commitSha !== expectedSha ||
    !RELEASE_ENVIRONMENTS.has(payload.release.environment) ||
    payload.checks.dataProvider !== 'ok'
  ) {
    throw new Error('Release readiness provenance does not match the requested release.')
  }

  return Object.freeze({
    commitSha: expectedSha,
    environment: payload.release.environment,
    dataProvider: 'ok'
  })
}

export const verifyReleaseTarget = async ({ baseUrl, releaseSha, fetchImpl = globalThis.fetch }) => {
  const origin = parseReleaseBaseUrl(baseUrl)
  const expectedSha = parseReleaseSha(releaseSha)
  if (typeof fetchImpl !== 'function') throw new Error('Release verifier is unavailable.')

  const response = await fetchImpl(`${origin}/api/readiness`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  })

  if (!response || response.status !== 200) {
    throw new Error('Release readiness could not be verified.')
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('Release readiness response is invalid.')
  }

  return Object.freeze({
    origin,
    ...validateReadinessPayload(payload, expectedSha)
  })
}
