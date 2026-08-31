import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('catalogue preserves a valid zero IBU value', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ ...product, ibu: 0 }],
      page: 1,
      pageSize: 24,
      total: 1,
      totalPages: 1
    })
  }))

  await page.goto('/home')

  const productCard = page.locator('article').filter({ hasText: 'Ace' })
  await expect(productCard.getByText('IBU', { exact: true })).toBeVisible()
  await expect(productCard.getByText('0', { exact: true })).toBeVisible()
})
