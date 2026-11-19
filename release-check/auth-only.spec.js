import { test as base } from '@playwright/test'
import { normalizeAuthUser } from '../src/hooks/useAuth.js'
import { createReleaseSessionScope, requiredEnvironment } from './support.js'
import { parseReleaseBaseUrl } from './releaseTarget.js'

const productionOrigin = 'https://brew-buds-mobile-app-design-3577.vercel.app'
const fail = message => new Error(message)

const test = base.extend({
  authSessions: [async ({ playwright }, runFixture) => {
    const origin = parseReleaseBaseUrl(process.env.RELEASE_BASE_URL)
    if (origin !== productionOrigin || process.env.RELEASE_CHECK_SCOPE !== 'auth-only' ||
        !/^[a-f0-9]{40}$/.test(process.env.RELEASE_SHA || '') ||
        process.env.RELEASE_SHA !== process.env.GITHUB_SHA ||
        process.env.RELEASE_DESTRUCTIVE_CONFIRMATION) {
      throw fail('The authentication-only release scope is unverified.')
    }
    const contexts = []
    const sessions = createReleaseSessionScope({
      newContext: options => playwright.request.newContext(options),
      contextFor: context => context,
      cookiesFor: async context => (await context.storageState()).cookies
    })
    const authenticate = async (email, password) => {
      if (contexts.length >= 2 || typeof email !== 'string' || !email.trim() ||
          typeof password !== 'string' || !password) {
        throw fail('Two configured release accounts are required.')
      }
      let context
      try { context = await playwright.request.newContext({ baseURL: origin, timeout: 15000 }) }
      catch { throw fail('The release authentication context is unavailable.') }
      contexts.push(context)
      sessions.track(context, email)
      const request = async (action, method, data) => {
        let response, requestFailed = false, captureFailed = false
        const options = { maxRedirects: 0, maxRetries: 0, timeout: 15000,
          headers: { Accept: 'application/json', Origin: origin } }
        try {
          response = method === 'POST'
            ? await context.post(`${origin}/api/nocodebackend/auth/${action}`, { ...options, data })
            : await context.get(`${origin}/api/nocodebackend/auth/${action}`, options)
        } catch { requestFailed = true }
        finally {
          // A failed response can still issue or rotate authentication cookies.
          try { await sessions.capture(context) } catch { captureFailed = true }
        }
        if (requestFailed) throw fail('The release authentication request is unavailable.')
        if (captureFailed) throw fail('Release session capture is unconfirmed.')
        return response
      }
      sessions.beginAuthentication(context)
      const signedIn = await request('sign-in/email', 'POST', { email, password })
      if (signedIn.status() < 200 || signedIn.status() >= 300) {
        throw fail('Release account authentication was rejected.')
      }
      const session = await request('get-session', 'GET')
      if (session.status() !== 200) throw fail('The release account session is unconfirmed.')
      let user
      try {
        const body = await session.body()
        if (!Buffer.isBuffer(body) || body.length > 65536) throw fail('session')
        user = normalizeAuthUser(JSON.parse(body.toString('utf8')))
      } catch { throw fail('The release account session identity is unconfirmed.') }
      if (!user || !user.id || /\s/.test(user.id) || typeof user.email !== 'string' ||
          user.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        throw fail('The release account session identity is unconfirmed.')
      }
      return user.id
    }
    let primaryError
    try { await runFixture({ authenticate }) } catch (error) { primaryError = error }
    let cleanupError
    try { await sessions.cleanup() } catch (error) { cleanupError = error }
    for (const context of contexts) {
      try { await context.dispose() }
      catch { cleanupError ||= fail('Release request context cleanup is unconfirmed.') }
    }
    if (primaryError && cleanupError) {
      throw new AggregateError([primaryError, cleanupError], 'Release authentication and cleanup failed.')
    }
    if (primaryError) throw primaryError
    if (cleanupError) throw cleanupError
  }, { timeout: 120_000 }]
})

// One API-only case; no page navigation or application data endpoint is used.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.describe.configure({ mode: 'serial', retries: 0 })

test('two distinct release accounts authenticate and close their original API sessions', async ({ authSessions }) => {
  test.setTimeout(90_000)
  const credentials = requiredEnvironment([
    'RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_PASSWORD', 'RELEASE_OTHER_EMAIL', 'RELEASE_OTHER_PASSWORD'
  ])
  if (credentials.RELEASE_OWNER_EMAIL.trim().toLowerCase() ===
      credentials.RELEASE_OTHER_EMAIL.trim().toLowerCase()) {
    throw fail('Two distinct release accounts are required.')
  }
  const owner = await authSessions.authenticate(credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)
  const other = await authSessions.authenticate(credentials.RELEASE_OTHER_EMAIL, credentials.RELEASE_OTHER_PASSWORD)
  if (owner === other) throw fail('The release accounts must resolve to distinct identities.')
})
