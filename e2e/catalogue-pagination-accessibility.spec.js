import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('catalogue pagination moves focus to the refreshed result set', async ({ page }) => {
  const pageOneItems = Array.from({ length: 24 }, (_, index) => ({
    ...product,
    id: index + 1,
    product_name: `Beer ${index + 1}`
  }))
  const pageTwoItem = {
    ...product,
    id: 25,
    product_name: 'Beer 25'
  }

  await page.route('**/api/nocodebackend/catalog/products?**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const requestedPage = Number(requestUrl.searchParams.get('page') || '1')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: requestedPage === 2 ? [pageTwoItem] : pageOneItems,
        page: requestedPage,
        pageSize: 24,
        total: 25,
        totalPages: 2
      })
    })
  })

  await page.goto('/home')

  const nextPage = page.getByRole('button', { name: 'Next product page, page 2' })
  await expect(nextPage).toBeVisible()
  await nextPage.focus()
  await expect(nextPage).toBeFocused()
  await nextPage.click()

  await expect(page.getByText('Beer 25')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Product results' })).toBeFocused()
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
})
