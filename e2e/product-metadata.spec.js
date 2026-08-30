import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('product details preserve a valid zero IBU value', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...product,
      ibu: 0
    })
  }))

  await page.goto('/products/4')

  const ibuLabel = page.getByText('IBU', { exact: true })
  await expect(ibuLabel).toBeVisible()
  await expect(ibuLabel.locator('xpath=following-sibling::dd')).toHaveText('0')
})
