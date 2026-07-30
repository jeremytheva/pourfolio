import { expect, test } from '@playwright/test'
import { product } from './mockApi.js'

const unavailableMessages = [
  'Sign-in options are temporarily unavailable.',
  'No sign-in methods are currently enabled.'
]

const mockSignedOutSession = async (page) => {
  let requests = 0
  await page.route('**/api/nocodebackend/auth/get-session', (route) => {
    requests += 1
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Authentication is required.' })
    })
  })
  return () => requests
}

const assertPasswordFormIsUsable = async (page) => {
  const email = page.getByLabel('Email')
  const password = page.getByLabel('Password')
  const submit = page.getByRole('button', { name: 'Sign in', exact: true })

  await expect(email).toBeVisible()
  await expect(email).toBeEditable()
  await expect(password).toBeVisible()
  await expect(password).toBeEditable()
  await expect(submit).toBeVisible()
  await expect(submit).toBeEnabled()
  await email.fill('usable@example.com')
  await password.fill('usable-password')

  for (const message of unavailableMessages) await expect(page.getByText(message)).toHaveCount(0)
  const bothMessagesArePresent = await page.getByText(unavailableMessages[0]).count() > 0 &&
    await page.getByText(unavailableMessages[1]).count() > 0
  expect(bothMessagesArePresent).toBe(false)
}

for (const response of [
  { name: 'email/password', body: { providers: [{ name: 'email-password', enabled: true }] } },
  { name: 'email OTP', body: { providers: [{ name: 'email-otp', enabled: true }] } },
  { name: 'Google', body: { providers: [{ name: 'google', enabled: true }] } }
]) {
  test(`provider discovery renders the ${response.name} response`, async ({ page }) => {
    const sessionRequests = await mockSignedOutSession(page)
    await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body)
    }))

    await page.goto('/login')
    await expect.poll(sessionRequests).toBe(1)
    if (response.name === 'email OTP') {
      await page.getByRole('button', { name: 'Email code' }).click()
      await expect(page.getByRole('button', { name: 'Send one-time passcode' })).toBeVisible()
    } else if (response.name === 'Google') {
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    } else {
      await assertPasswordFormIsUsable(page)
    }
  })
}

for (const status of [404, 500]) {
  test(`password form remains usable after provider discovery returns ${status}`, async ({ page }) => {
    const sessionRequests = await mockSignedOutSession(page)
    await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Provider discovery failed.' })
    }))

    const discoveryResponse = page.waitForResponse('**/api/nocodebackend/auth/providers')
    await page.goto('/login')
    await discoveryResponse
    await expect.poll(sessionRequests).toBe(1)
    await assertPasswordFormIsUsable(page)
  })
}

test('password form renders without waiting for pending provider discovery', async ({ page }) => {
  const sessionRequests = await mockSignedOutSession(page)
  let releaseDiscovery
  await page.route('**/api/nocodebackend/auth/providers', async (route) => {
    await new Promise((resolve) => { releaseDiscovery = resolve })
    await route.fulfill({ status: 500, body: '{}' })
  })

  await page.goto('/login')
  await assertPasswordFormIsUsable(page)
  await page.waitForTimeout(1_000)
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
  await expect.poll(sessionRequests).toBe(1)
  expect(releaseDiscovery).toBeDefined()
  releaseDiscovery()
})

test('create-account mode submits the expected email sign-up request', async ({ page }) => {
  const sessionRequests = await mockSignedOutSession(page)
  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ providers: [{ name: 'email-password', enabled: true }] })
  }))
  await page.route('**/api/nocodebackend/auth/sign-up/email', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: 'new@example.com',
      password: 'correct-horse',
      name: 'New Drinker',
      metadata: { name: 'New Drinker' }
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accepted: true }) })
  })

  await page.goto('/login')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByLabel('Confirm password')).toBeVisible()
  await page.getByLabel('Name').fill('New Drinker')
  await page.getByLabel('Email').fill('new@example.com')
  await page.getByLabel('Password').fill('correct-horse')
  await page.getByLabel('Confirm password').fill('correct-horse')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Account created. Check your email if verification is required.')).toBeVisible()
  await expect.poll(sessionRequests).toBe(1)
})

test('password sign-in discovers the provider and enters the launch app', async ({ page }) => {
  let signedIn = false
  let sessionRequests = 0

  await page.route('**/api/nocodebackend/auth/get-session', (route) => {
    sessionRequests += 1
    return route.fulfill({
      status: signedIn ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(signedIn ? { user: { id: 'user-1', email: 'jeremy@example.com', name: 'Jeremy' } } : { error: 'Authentication is required.' })
    })
  })
  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ providers: [{ name: 'email-password', enabled: true }] })
  }))
  await page.route('**/api/nocodebackend/auth/sign-in/email', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: 'jeremy@example.com', password: 'correct-horse' })
    signedIn = true
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'user-1', email: 'jeremy@example.com', name: 'Jeremy' } }) })
  })
  await page.route('**/api/nocodebackend/profile', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ profile: { id: 'user-1', name: 'Jeremy', description: '', avatar_url: null } })
  }))
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ items: [product], page: 1, pageSize: 24, total: 1, totalPages: 1 })
  }))

  await page.goto('/login')
  await page.getByLabel('Email').fill('jeremy@example.com')
  await page.getByLabel('Password').fill('correct-horse')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
  expect(sessionRequests).toBe(1)
})
