import { expect, test } from '@playwright/test'

test('authentication mode switches move focus to the first relevant field', async ({ page }) => {
  await page.route('**/api/nocodebackend/auth/get-session', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Authentication is required.' })
  }))
  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ providers: [{ name: 'email-password', enabled: true }] })
  }))

  await page.goto('/login')
  const email = page.getByLabel('Email')
  await expect(email).toBeVisible()

  await page.getByRole('button', { name: 'Create account' }).click()
  const name = page.getByLabel('Name')
  await expect(name).toBeVisible()
  await expect(name).toBeFocused()

  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(email).toBeVisible()
  await expect(email).toBeFocused()
})
