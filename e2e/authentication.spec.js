import { expect, test } from '@playwright/test'
import { product } from './mockApi.js'

test('password sign-in discovers the provider and enters the launch app', async ({ page }) => {
  let signedIn = false

  await page.route('**/api/nocodebackend/auth/get-session', (route) => route.fulfill({
    status: signedIn ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(
      signedIn
        ? { user: { id: 'user-1', email: 'jeremy@example.com', name: 'Jeremy' } }
        : { error: 'Authentication is required.' }
    )
  }))

  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ providers: [{ name: 'email-password', enabled: true }] })
  }))

  await page.route('**/api/nocodebackend/auth/sign-in/email', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: 'jeremy@example.com',
      password: 'correct-horse'
    })
    signedIn = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'user-1', email: 'jeremy@example.com', name: 'Jeremy' }
      })
    })
  })

  await page.route('**/api/nocodebackend/profile', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      profile: { id: 'user-1', name: 'Jeremy', description: '', avatar_url: null }
    })
  }))

  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [product],
      page: 1,
      pageSize: 24,
      total: 1,
      totalPages: 1
    })
  }))

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  await page.getByLabel('Email').fill('jeremy@example.com')
  await page.getByLabel('Password').fill('correct-horse')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
})
