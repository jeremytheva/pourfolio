import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('product load failure is focused and retry recovers focus to the product heading', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/catalog/products/4', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    attempts += 1
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Product details unavailable.' })
      })
    }
    return route.fallback()
  })

  await page.goto('/products/4')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Product details unavailable.')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  const productHeading = page.getByRole('heading', { level: 1, name: 'Ace' })
  await expect(productHeading).toBeVisible()
  await expect(productHeading).toBeFocused()
  await expect(alert).toHaveCount(0)
})

test('failed product retry returns focus to the error alert', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/4', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Product details unavailable.' })
    })
  })

  await page.goto('/products/4')

  const alert = page.getByRole('alert')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(alert).toContainText('Product details unavailable.')
  await expect(alert).toBeFocused()
})
