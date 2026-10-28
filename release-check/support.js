import { expect } from '@playwright/test'
import { assertReleasePageOrigin, parseReleaseBaseUrl } from './releaseTarget.js'
import { restoreReleaseOwnerSession, saveReleaseOwnerSession } from './ownerSession.js'

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

const retryAfterMilliseconds = (response) => {
  const value = response.headers()['retry-after']
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds * 1000), 20_000)
  return 20_000
}

export const signIn = async (page, email, password, { reuseSession = false } = {}) => {
  const origin = parseReleaseBaseUrl(process.env.RELEASE_BASE_URL)
  const requireCurrentOrigin = () => assertReleasePageOrigin(page.url(), origin)
  if (reuseSession && await restoreReleaseOwnerSession(page, email)) {
    await expect(page).toHaveURL(/\/home$/)
    requireCurrentOrigin()
    return
  }
  await page.goto('/login')
  requireCurrentOrigin()
  await page.getByLabel('Email').fill(email)
  requireCurrentOrigin()
  await page.getByLabel('Password').fill(password)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    requireCurrentOrigin()
    const responsePromise = page.waitForResponse((response) => signInResponse(response, origin))
    await page.getByRole('button', { name: 'Sign in' }).click()
    const response = await responsePromise

    if (response.status() !== 429) {
      await expect(page).toHaveURL(/\/home$/)
      requireCurrentOrigin()
      saveReleaseOwnerSession(await page.context().storageState(), email)
      return
    }

    if (attempt === 1) throw new Error('Connected release sign-in remained rate-limited after one bounded retry.')
    await page.waitForTimeout(retryAfterMilliseconds(response))
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
