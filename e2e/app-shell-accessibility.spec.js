import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('app shell announces SPA navigation and preserves current-page semantics', async ({ page }) => {
  await page.goto('/home')

  const routeStatus = page.getByRole('status').filter({ hasText: 'Discover' })
  await expect(routeStatus).toHaveText('Discover')
  await expect(page.getByRole('link', { name: 'Discover' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('link', { name: 'Search' }).click()
  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByRole('status').filter({ hasText: 'Search' })).toHaveText('Search')
  await expect(page.getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current', 'page')
})

test('sign out exposes pending state and prevents duplicate activation', async ({ page }) => {
  let signOutRequests = 0
  let releaseSignOut
  const signOutGate = new Promise((resolve) => { releaseSignOut = resolve })

  await page.route('**/api/nocodebackend/auth/sign-out', async (route) => {
    signOutRequests += 1
    await signOutGate
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/home')
  const signOut = page.getByRole('button', { name: 'Sign out' })
  await signOut.click()

  const signingOut = page.getByRole('button', { name: 'Signing out' })
  await expect(signingOut).toBeDisabled()
  await expect(signingOut).toHaveAttribute('aria-busy', 'true')
  await signingOut.click({ force: true })
  expect(signOutRequests).toBe(1)

  releaseSignOut()
  await expect(page).toHaveURL(/\/login$/)
})

test('failed sign out keeps the session visible and provides a focused retry path', async ({ page }) => {
  let signOutRequests = 0

  await page.route('**/api/nocodebackend/auth/sign-out', async (route) => {
    signOutRequests += 1
    if (signOutRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Sign out temporarily unavailable' })
      })
      return
    }
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/home')
  await page.getByRole('button', { name: 'Sign out' }).click()

  await expect(page).toHaveURL(/\/home$/)
  const error = page.getByRole('alert')
  await expect(error).toBeVisible()
  await expect(error).toBeFocused()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled()

  await page.getByRole('button', { name: 'Sign out' }).click()
  expect(signOutRequests).toBe(2)
  await expect(page).toHaveURL(/\/login$/)
})
