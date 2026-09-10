import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('catalogue load failure focuses recovery and retries successfully', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/catalog/products?**', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Catalogue temporarily unavailable.' })
      })
      return
    }

    await route.fallback()
  })

  await page.goto('/home')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Products are unavailable')
  await expect(alert).toContainText('Catalogue temporarily unavailable.')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(alert).toHaveCount(0)
  await expect(page.locator('a[href="/products/4"]')).toBeVisible()
  expect(attempts).toBe(2)
})

test('catalogue network failure uses a safe focused recovery state and retry succeeds', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/catalog/products?**', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.abort('failed')
      return
    }
    await route.fallback()
  })

  await page.goto('/home')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Products are unavailable')
  await expect(alert).toContainText('The service could not be reached. Please check your connection and try again.')
  await expect(alert).toBeFocused()
  await expect(page.getByText(/products? found/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(alert).toHaveCount(0)
  await expect(page.locator('a[href="/products/4"]')).toBeVisible()
  expect(attempts).toBe(2)
})