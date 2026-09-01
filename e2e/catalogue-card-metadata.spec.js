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

test('catalogue card exposes real image meaning and keeps the primary action keyboard focusable', async ({ page }) => {
  const realImage = 'https://images.example.test/ace.jpg'
  await page.route(realImage, (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ ...product, product_image: realImage }],
      page: 1,
      pageSize: 24,
      total: 1,
      totalPages: 1
    })
  }))

  await page.goto('/home')

  const productCard = page.locator('article').filter({ hasText: 'Ace' })
  await expect(productCard.locator('img')).toHaveAttribute('alt', 'Ace by Rocky Ridge Brewing')

  const productLink = productCard.getByRole('link', { name: 'View product' })
  await productLink.focus()
  await expect(productLink).toBeFocused()
})

test('catalogue fallback image remains decorative', async ({ page }) => {
  await page.goto('/home')

  const productCard = page.locator('article').filter({ hasText: 'Ace' })
  await expect(productCard.locator('img')).toHaveAttribute('alt', '')
})
