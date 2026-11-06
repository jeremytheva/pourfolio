import { expect } from '@playwright/test'
import { parseReleaseBaseUrl } from './releaseTarget.js'
import { forgetReleaseOwnerSession, restoreReleaseOwnerSession, saveReleaseOwnerSession } from './ownerSession.js'

export const requiredEnvironment = (names) => Object.fromEntries(names.map((name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for the controlled release check.`)
  return [name, value]
}))

const signInResponse = (response, origin) => {
  if (response.request().method() !== 'POST') return false
  const url = new URL(response.url())
  return url.origin === origin && url.pathname === '/api/nocodebackend/auth/sign-in/email'
}

const assertPageOrigin = (page, origin) => {
  let actual
  try { actual = new URL(page.url()).origin } catch { /* Discard private URLs. */ }
  if (actual !== origin) throw new Error('Release page origin is unverified.')
}

// Browser contexts and the owner cache are private local state, not revocation
// evidence. Retain immutable original cookies before logout, then test those
// cookies in a separate request context after the sign-out request.
export const createReleaseSessionScope = ({ newContext }) => {
  const origin = parseReleaseBaseUrl(process.env.RELEASE_BASE_URL)
  const hostname = new URL(origin).hostname
  const sessions = new Map()
  let closed = false
  const fail = () => new Error('Release session cleanup is unconfirmed.')
  const sessionFor = (page) => {
    const session = sessions.get(page.context())
    if (!session || closed) throw fail()
    return session
  }
  const track = (page, email) => {
    if (closed || typeof newContext !== 'function') throw fail()
    const context = page.context()
    const existing = sessions.get(context)
    if (existing) {
      if (existing.email !== email) throw fail()
      return
    }
    if (sessions.size >= 2) throw fail()
    sessions.set(context, { context, page, email, attempted: false, snapshots: [], overflow: null, captureFailed: false })
  }
  const capture = async (page) => {
    const session = sessionFor(page)
    try {
      const cookies = (await session.context.cookies()).filter(cookie =>
        cookie.domain.replace(/^\./, '') === hostname)
      if (cookies.length > 100) throw fail()
      const serialised = JSON.stringify(cookies)
      if (serialised.length > 65536) throw fail()
      if (cookies.length && !session.snapshots.some(snapshot => snapshot.serialised === serialised)) {
        const snapshot = { serialised, cookies: JSON.parse(serialised) }
        if (session.snapshots.length >= 5) {
          // Never claim complete capture after an unexpected number of cookie
          // rotations. One replaceable overflow slot retains the latest jar
          // for best-effort cleanup; earlier overflow jars are unqualified.
          session.overflow = snapshot
          throw fail()
        }
        session.snapshots.push(snapshot)
      }
    } catch {
      session.captureFailed = true
      throw fail()
    }
  }
  const request = async (cookies, action) => {
    let context
    let confirmed = false
    try {
      context = await newContext({ baseURL: origin, timeout: 4000,
        storageState: { cookies: JSON.parse(JSON.stringify(cookies)), origins: [] } })
      const options = { maxRedirects: 0, maxRetries: 0, timeout: 4000,
        headers: { Accept: 'application/json', Origin: origin } }
      const response = action === 'sign-out'
        ? await context.post(`${origin}/api/nocodebackend/auth/sign-out`, { ...options, data: {} })
        : await context.get(`${origin}/api/nocodebackend/auth/get-session`, options)
      const status = response.status()
      confirmed = action === 'sign-out' ? status >= 200 && status < 300 : status === 401
    } catch { /* Do not retain transport errors, URLs, headers or cookies. */ }
    finally {
      if (context) {
        try { await context.dispose() } catch { confirmed = false }
      }
    }
    return confirmed
  }
  const cleanup = async () => {
    if (closed) throw fail()
    for (const session of sessions.values()) {
      try { await capture(session.page) } catch { /* Retain failure and continue every session. */ }
    }
    closed = true
    let confirmed = true
    for (const session of sessions.values()) {
      if (session.captureFailed || session.attempted && !session.snapshots.length) confirmed = false
      for (const snapshot of [...session.snapshots, ...(session.overflow ? [session.overflow] : [])]) {
        // Always attempt the original-cookie probe, even if sign-out failed.
        const signedOut = await request(snapshot.cookies, 'sign-out')
        const revoked = await request(snapshot.cookies, 'get-session')
        if (!signedOut || !revoked) confirmed = false
      }
      try { forgetReleaseOwnerSession(session.email) } catch { confirmed = false }
      session.snapshots.length = 0
      session.overflow = null
    }
    sessions.clear()
    if (!confirmed) throw fail()
  }
  return Object.freeze({ track, capture, cleanup,
    beginAuthentication: (page) => { sessionFor(page).attempted = true } })
}

const retryAfterMilliseconds = (response) => {
  const value = response.headers()['retry-after']
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds * 1000), 20_000)
  return 20_000
}

export const signIn = async (page, email, password, { reuseSession = false, sessionScope } = {}) => {
  const origin = parseReleaseBaseUrl(process.env.RELEASE_BASE_URL)
  sessionScope?.track(page, email)
  try {
    if (reuseSession && await restoreReleaseOwnerSession(page, email, {
      onRestored: () => sessionScope?.capture(page)
    })) {
      await expect(page).toHaveURL(/\/home$/)
      assertPageOrigin(page, origin)
      return
    }
    await page.goto('/login')
    assertPageOrigin(page, origin)
    await page.getByLabel('Email').fill(email)
    assertPageOrigin(page, origin)
    await page.getByLabel('Password').fill(password)

    for (let attempt = 0; attempt < 2; attempt += 1) {
      assertPageOrigin(page, origin)
      sessionScope?.beginAuthentication(page)
      const responsePromise = page.waitForResponse(response => signInResponse(response, origin))
      await page.getByRole('button', { name: 'Sign in' }).click()
      const response = await responsePromise
      if (sessionScope) await sessionScope.capture(page)

      if (response.status() !== 429) {
        await expect(page).toHaveURL(/\/home$/)
        assertPageOrigin(page, origin)
        saveReleaseOwnerSession(await page.context().storageState(), email)
        return
      }

      if (attempt === 1) throw new Error('Connected release sign-in remained rate-limited after one bounded retry.')
      await page.waitForTimeout(retryAfterMilliseconds(response))
    }
  } finally {
    // This also covers a session created before a post-login failure. Keep its
    // capture failure for teardown without replacing the primary test error.
    if (sessionScope) await sessionScope.capture(page).catch(() => {})
  }
}

export const signOut = async (page) => {
  await page.getByRole('button', { name: /sign out/i }).click()
  await expect(page).toHaveURL(/\/login$/)
}

export const responseJson = async (response) => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON from ${response.url()}, received status ${response.status()}.`)
  }
}

export const assertNoSeriousAxeViolations = async (results, pathname) => {
  expect(results.violations, `axe violations on ${pathname}`).toEqual([])
}
