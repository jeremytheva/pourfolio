import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('rating form retry restores focus to the recovered product heading', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/rating-form**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    attempts += 1
    if (attempts > 1) return route.fallback()

    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rating form unavailable.' })
    })
  })

  await page.goto('/products/4/rate')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Rating form unavailable.')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  const heading = page.getByRole('heading', { level: 1, name: 'Ace' })
  await expect(heading).toBeVisible()
  await expect(heading).toBeFocused()
  await expect(alert).toHaveCount(0)
})

test('failed rating form retry returns focus to the load error alert', async ({ page }) => {
  await page.route('**/api/nocodebackend/rating-form**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rating form unavailable.' })
    })
  })

  await page.goto('/products/4/rate')

  const alert = page.getByRole('alert')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(alert).toContainText('Rating form unavailable.')
  await expect(alert).toBeFocused()
})
