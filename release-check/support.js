import { expect } from '@playwright/test'

export const requiredEnvironment = (names) => Object.fromEntries(names.map((name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for the controlled release check.`)
  return [name, value]
}))

export const signIn = async (page, email, password) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/home$/)
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
