import { extractSessionUser } from '../api/_lib/authSession.js'
import { verifyReleaseTarget } from '../release-check/releaseTarget.js'

const fail = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra })

// Reuse the application's normal sign-in boundary and the existing release
// provenance verifier. Credentials and cookies remain in the protected worker.
export const resolveBonusCertificationOwner = async ({ environment = process.env, fetchImpl = fetch } = {}) => {
  const configuredId = environment.NOCODEBACKEND_CONTRACT_USER_ID?.trim()
  if (configuredId) return { id: configuredId, source: 'configured-contract-user' }

  const required = ['BONUS_CERTIFICATION_BASE_URL', 'BONUS_CERTIFICATION_AUTH_SHA', 'RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_PASSWORD']
  const missing = required.filter((name) => !environment[name]?.trim())
  if (missing.length) throw fail('RUNTIME_CONFIGURATION_MISSING', {
    missing: ['NOCODEBACKEND_CONTRACT_USER_ID', ...missing]
  })

  let targetStatus = null
  const boundedFetch = async (url, init) => {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15_000) })
    if (new URL(url).pathname === '/api/readiness') targetStatus = response.status
    return response
  }
  let origin
  let authCommit
  try {
    const verified = await verifyReleaseTarget({ baseUrl: environment.BONUS_CERTIFICATION_BASE_URL,
      releaseSha: environment.BONUS_CERTIFICATION_AUTH_SHA, fetchImpl: boundedFetch })
    origin = verified.origin
    authCommit = verified.commitSha
  } catch {
    throw fail('BONUS_TEST_OWNER_TARGET_UNVERIFIED', { targetStatus })
  }
  const email = environment.RELEASE_OWNER_EMAIL.trim()
  let cookie = ''
  let user
  let failure
  const request = (action, method, body) => {
    const url = new URL(`${origin}/api/nocodebackend/auth/${action}`)
    return boundedFetch(url, {
      method, redirect: 'error',
      headers: {
        accept: 'application/json', 'content-type': 'application/json',
        origin, ...(cookie ? { cookie } : {})
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
  }

  try {
    const signedIn = await request('sign-in/email', 'POST', { email, password: environment.RELEASE_OWNER_PASSWORD })
    const headers = signedIn.headers.getSetCookie?.() || []
    const cookies = headers.length ? headers : String(signedIn.headers.get('set-cookie') || '').split(/,(?=\s*[^;,\s]+=)/)
    cookie = cookies.map((value) => value.split(';', 1)[0].trim()).filter(Boolean).join('; ')
    if (!signedIn.ok) throw fail('BONUS_TEST_OWNER_AUTH_REJECTED')
    if (!cookie) throw fail('BONUS_TEST_OWNER_SESSION_UNCONFIRMED')
    // A login response ID alone is insufficient: verify the resulting session.
    const session = await request('get-session', 'GET')
    if (!session.ok) throw fail('BONUS_TEST_OWNER_SESSION_UNCONFIRMED')
    user = extractSessionUser(await session.json().catch(() => null))
    if (!user || user.id.trim() !== user.id || !user.id ||
      typeof user.email !== 'string' || user.email.trim().toLowerCase() !== email.toLowerCase()) {
      throw fail('BONUS_TEST_OWNER_SESSION_UNCONFIRMED')
    }
  } catch (error) {
    failure = ['BONUS_TEST_OWNER_AUTH_REJECTED', 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED'].includes(error?.code)
      ? error : fail('BONUS_TEST_OWNER_AUTH_UNAVAILABLE')
  }

  if (cookie) {
    try {
      if (!(await request('sign-out', 'POST', {})).ok) throw fail('BONUS_TEST_OWNER_SIGNOUT_UNCONFIRMED')
    } catch {
      failure ||= fail('BONUS_TEST_OWNER_SIGNOUT_UNCONFIRMED')
      failure.sessionCleanup = 'UNCONFIRMED'
    }
  }
  if (failure) throw failure
  return { id: user.id, source: 'verified-release-session', authCommit }
}
