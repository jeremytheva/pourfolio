import { extractSessionUser } from '../api/_lib/authSession.js'
import { resolveAuthCredential } from '../api/_lib/ncbCredentials.js'
import { resolveAuthBaseUrl } from '../api/_lib/nocodeBackendConfig.js'

const fail = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra })

// Credentials and cookies remain inside the protected worker. A database key
// authenticates the service request; only the release password signs in a user.
export const resolveBonusCertificationOwner = async ({ environment = process.env, fetchImpl = fetch } = {}) => {
  const configuredId = environment.NOCODEBACKEND_CONTRACT_USER_ID?.trim()
  if (configuredId) return { id: configuredId, source: 'configured-contract-user' }

  const required = ['NOCODEBACKEND_AUTH_SECRET_KEY', 'NOCODEBACKEND_INSTANCE', 'RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_PASSWORD']
  const missing = required.filter((name) => !environment[name]?.trim())
  if (missing.length) throw fail('RUNTIME_CONFIGURATION_MISSING', {
    missing: ['NOCODEBACKEND_CONTRACT_USER_ID', ...missing]
  })

  const base = resolveAuthBaseUrl(environment.NOCODEBACKEND_AUTH_BASE_URL)
  const secret = resolveAuthCredential(environment).value
  const email = environment.RELEASE_OWNER_EMAIL.trim()
  const instance = environment.NOCODEBACKEND_INSTANCE.trim()
  let cookie = ''
  let user
  let failure
  const request = (action, method, body) => {
    const url = new URL(`${base}/${action}`)
    url.searchParams.set('instance', instance)
    return fetchImpl(url, {
      method, redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: {
        accept: 'application/json', 'content-type': 'application/json',
        authorization: `Bearer ${secret}`, 'x-database-instance': instance,
        origin: new URL(base).origin, ...(cookie ? { cookie } : {})
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
  return { id: user.id, source: 'verified-release-session' }
}
