import { expect, test } from '@playwright/test'

const mockSignedOutSession = async (page) => {
  await page.route('**/api/nocodebackend/auth/get-session', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Authentication is required.' })
  }))
}

const mockPasswordAndOtpProviders = async (page) => {
  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      providers: [
        { name: 'email-password', enabled: true },
        { name: 'email-otp', enabled: true }
      ]
    })
  }))
}

test('sign-in method controls expose selected state and switch accessibly', async ({ page }) => {
  await mockSignedOutSession(page)
  await mockPasswordAndOtpProviders(page)

  await page.goto('/login')

  const password = page.getByRole('button', { name: 'Password' })
  const emailCode = page.getByRole('button', { name: 'Email code' })
  await expect(password).toHaveAttribute('aria-pressed', 'true')
  await expect(emailCode).toHaveAttribute('aria-pressed', 'false')

  await emailCode.click()
  await expect(password).toHaveAttribute('aria-pressed', 'false')
  await expect(emailCode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Send one-time passcode' })).toBeVisible()
})

test('pending password sign-in exposes busy state, locks conflicting controls and focuses failure', async ({ page }) => {
  await mockSignedOutSession(page)
  await mockPasswordAndOtpProviders(page)

  let releaseSignIn
  const signInGate = new Promise((resolve) => { releaseSignIn = resolve })
  await page.route('**/api/nocodebackend/auth/sign-in/email', async (route) => {
    await signInGate
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Authentication is temporarily unavailable.' })
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('jeremy@example.com')
  await page.getByLabel('Password').fill('correct-horse')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  const form = page.locator('form')
  const working = page.getByRole('button', { name: 'Working…' })
  await expect(form).toHaveAttribute('aria-busy', 'true')
  await expect(working).toHaveAttribute('aria-busy', 'true')
  await expect(working).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Password' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Email code' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()

  releaseSignIn()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Authentication is temporarily unavailable.')
  await expect(alert).toBeFocused()
  await expect(form).toHaveAttribute('aria-busy', 'false')
})

test('provider discovery failure receives keyboard focus', async ({ page }) => {
  await mockSignedOutSession(page)
  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Provider discovery failed.' })
  }))

  await page.goto('/login')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Sign-in options are temporarily unavailable.')
  await expect(alert).toBeFocused()
})
