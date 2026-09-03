import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('rating history retry restores focus to the recovered heading', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/ratings/mine', async (route) => {
    attempts += 1
    if (attempts > 1) return route.fallback()

    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rating history unavailable.' })
    })
  })

  await page.goto('/profile')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Rating history unavailable.')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Retry rating history' }).click()

  const heading = page.getByRole('heading', { name: 'My ratings' })
  await expect(page.getByRole('link', { name: 'Ace' })).toBeVisible()
  await expect(heading).toBeFocused()
  await expect(alert).toHaveCount(0)
})

test('failed rating history retry returns focus to the load error alert', async ({ page }) => {
  await page.route('**/api/nocodebackend/ratings/mine', async (route) => {
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rating history unavailable.' })
    })
  })

  await page.goto('/profile')

  const alert = page.getByRole('alert')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Retry rating history' }).click()

  await expect(alert).toContainText('Rating history unavailable.')
  await expect(alert).toBeFocused()
})