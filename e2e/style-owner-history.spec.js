import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const historyRating = (id, ratedProduct) => ({
  id,
  rating_id: 1700000000000000 + id,
  product_id: ratedProduct.id,
  cellar_id: null,
  date_rated: '2026-09-11T00:00:00.000Z',
  total_unweighted: 4,
  total_weighted: 4,
  product: ratedProduct
})

const installStylePage = async (page) => {
  await installMockApi(page)
  const bravo = { ...product, id: 5, product_name: 'Bravo' }
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const requestUrl = new URL(route.request().url())
    const pageSize = Number(requestUrl.searchParams.get('limit') || 24)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [product, bravo], page: 1, pageSize, total: 2, totalPages: 1 })
    })
  })
  return bravo
}

test('style page shows only exact owner history for the canonical style', async ({ page }) => {
  const bravo = await installStylePage(page)
  const stout = {
    ...product,
    id: 6,
    product_name: 'Dark',
    product_category_id: 11,
    category: { id: 11, category_name: 'Stout' }
  }
  const mismatched = {
    ...product,
    id: 7,
    product_name: 'Mismatch',
    product_category_id: 11,
    category: { id: 10, category_name: 'Pale Ale' }
  }

  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [
      historyRating(1, product),
      historyRating(2, product),
      historyRating(3, bravo),
      historyRating(4, stout),
      historyRating(5, mismatched)
    ] })
  }))

  await page.goto('/styles/10')

  await expect(page.getByRole('heading', { name: 'Pale Ale' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your history in this style' })).toBeVisible()
  await expect(page.getByText('Tastings', { exact: true }).locator('..')).toContainText('3')
  await expect(page.getByText('Unique beers', { exact: true }).locator('..')).toContainText('2')

  const history = page.getByRole('list', { name: 'Your Pale Ale tasting history' })
  await expect(history.getByRole('link', { name: 'Ace' })).toHaveAttribute('href', '/products/4')
  await expect(history.getByRole('link', { name: 'Bravo' })).toHaveAttribute('href', '/products/5')
  await expect(history.getByText('2 tastings')).toBeVisible()
  await expect(history.getByText('1 tasting')).toBeVisible()
  await expect(history.getByText('Dark')).toHaveCount(0)
  await expect(history.getByText('Mismatch')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open Beer Passport' })).toHaveAttribute('href', '/taste-map')
})

test('personal history failure does not block the canonical style page and retry recovers', async ({ page }) => {
  await installStylePage(page)
  let attempts = 0
  await page.route('**/api/nocodebackend/ratings/mine', (route) => {
    attempts += 1
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rating history is temporarily unavailable.' })
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [historyRating(1, product)] })
    })
  })

  await page.goto('/styles/10')

  await expect(page.getByRole('heading', { name: 'Pale Ale' })).toBeVisible()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Personal style history unavailable')
  await page.getByRole('button', { name: 'Retry personal history' }).click()

  await expect(page.getByText('Tastings', { exact: true }).locator('..')).toContainText('1')
  await expect(page.getByRole('link', { name: 'Ace' }).first()).toBeVisible()
})
