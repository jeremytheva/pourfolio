import { expect } from '@playwright/test'

export const requiredEnvironment = (names) => Object.fromEntries(names.map((name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for the controlled release check.`)
  return [name, value]
}))

const signInResponse = (response) => {
  if (response.request().method() !== 'POST') return false
  return new URL(response.url()).pathname === '/api/nocodebackend/auth/sign-in/email'
}

const retryAfterMilliseconds = (response) => {
  const value = response.headers()['retry-after']
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds * 1000), 20_000)
  return 20_000
}

export const signIn = async (page, email, password) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const responsePromise = page.waitForResponse(signInResponse)
    await page.getByRole('button', { name: 'Sign in' }).click()
    const response = await responsePromise

    if (response.status() !== 429) {
      await expect(page).toHaveURL(/\/home$/)
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
