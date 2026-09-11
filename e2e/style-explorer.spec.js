import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const installStyleMockApi = async (page) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const requestUrl = new URL(route.request().url())
    const pageSize = Number(requestUrl.searchParams.get('limit') || 24)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [product], page: 1, pageSize, total: 1, totalPages: 1 })
    })
  })
}

test('style explorer derives verified styles and opens a stable style route', async ({ page }) => {
  await installStyleMockApi(page)
  await page.goto('/styles')

  await expect(page.getByRole('heading', { name: 'Explore verified beer styles' })).toBeVisible()
  await expect(page.getByText('1 verified style represented in the catalogue.')).toBeVisible()

  const styleLink = page.getByRole('link', { name: /Pale Ale/ })
  await expect(styleLink).toContainText('1')
  await styleLink.click()

  await expect(page).toHaveURL(/\/styles\/10$/)
  await expect(page.getByRole('heading', { name: 'Pale Ale' })).toBeVisible()
  await expect(page.getByText('Reference descriptions, expected characteristics and typical ranges are intentionally omitted')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Rocky Ridge Brewing' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ace/ })).toBeVisible()
})

test('style search filters only verified catalogue styles', async ({ page }) => {
  await installStyleMockApi(page)
  await page.goto('/styles')

  const search = page.getByRole('searchbox', { name: 'Search styles' })
  await search.fill('stout')

  await expect(page.getByText('No beer styles match this search.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Pale Ale/ })).toHaveCount(0)
})

test('invalid style identifiers fail through the accessible unavailable state', async ({ page }) => {
  await installStyleMockApi(page)
  await page.goto('/styles/010')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Beer style unavailable')
  await expect(alert).toContainText('Style identifier is invalid.')
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to styles' })).toBeVisible()
})
