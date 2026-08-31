import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('product load failure is focused and retry recovers the product', async ({ page }) => {
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

  await expect(page.getByRole('heading', { level: 1, name: 'Ace' })).toBeVisible()
  await expect(alert).toHaveCount(0)
})
