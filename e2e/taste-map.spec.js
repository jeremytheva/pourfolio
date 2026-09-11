import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const historyRating = (id, ratedProduct) => ({
  id,
  rating_id: 1700000000000000 + id,
  product_id: ratedProduct.id,
  cellar_id: null,
  date_rated: '2026-09-01T00:00:00.000Z',
  total_unweighted: 4,
  total_weighted: 4,
  product: ratedProduct
})

test('Beer Passport distinguishes tastings from unique beers and uses only verified relationships', async ({ page }) => {
  await installMockApi(page)
  const bravo = { ...product, id: 5, product_name: 'Bravo' }
  const unknown = {
    ...product,
    id: 6,
    product_name: 'Mystery Beer',
    product_category_id: null,
    category: null,
    producer_id: null,
    producer: null
  }

  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [
      historyRating(1, product),
      historyRating(2, product),
      historyRating(3, bravo),
      historyRating(4, unknown)
    ] })
  }))

  await page.goto('/taste-map')

  await expect(page.getByRole('heading', { name: 'Your beer exploration' })).toBeVisible()
  await expect(page.getByText('Tastings', { exact: true }).locator('..')).toContainText('4')
  await expect(page.getByText('Unique beers', { exact: true }).locator('..')).toContainText('3')
  await expect(page.getByText('Verified styles', { exact: true }).locator('..')).toContainText('1')
  await expect(page.getByText('Verified breweries', { exact: true }).locator('..')).toContainText('1')

  await expect(page.getByRole('link', { name: 'Pale Ale', exact: true })).toHaveAttribute('href', '/styles/10')
  await expect(page.getByRole('link', { name: 'Rocky Ridge Brewing', exact: true })).toHaveAttribute('href', '/breweries/20')
  await expect(page.getByText('2 beers · 3 tastings')).toHaveCount(2)
  await expect(page.getByText(/Unverified\/unknown style: 1 beer across 1 tasting/)).toBeVisible()
  await expect(page.getByText(/Unverified\/unknown brewery: 1 beer across 1 tasting/)).toBeVisible()
  await expect(page.getByText(/Country and region exploration will appear when Pourfolio has governed canonical geography/)).toBeVisible()

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(result.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
})

test('Beer Passport exposes an honest empty state', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [] })
  }))

  await page.goto('/taste-map')
  await expect(page.getByRole('heading', { name: 'No tasting history yet' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Discover beers' })).toHaveAttribute('href', '/home')
  await expect(page.getByRole('heading', { name: 'Geography' })).toBeVisible()
})

test('Beer Passport load failure has a focused retry path', async ({ page }) => {
  await installMockApi(page)
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

  await page.goto('/taste-map')
  const alert = page.getByRole('alert')
  await expect(alert).toBeFocused()
  await expect(alert).toContainText('Beer Passport unavailable')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Your beer exploration' })).toBeVisible()
  await expect(page.getByText('Unique beers', { exact: true }).locator('..')).toContainText('1')
})
