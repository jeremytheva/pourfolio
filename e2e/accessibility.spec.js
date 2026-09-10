import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

const routes = ['/home', '/products/4', '/products/4/rate', '/breweries/20', '/cellar', '/profile']
const publicDocumentRoutes = ['/privacy', '/terms', '/moderation', '/support', '/retention']

test('/login has no serious or critical automated accessibility violations', async ({ page }) => {
  await page.route('**/api/nocodebackend/auth/get-session', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Authentication is required.' })
  }))
  await page.route('**/api/nocodebackend/auth/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ providers: [{ name: 'email-password', enabled: true }] })
  }))

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()

  const serious = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
  expect(serious).toEqual([])
})

for (const route of publicDocumentRoutes) {
  test(`${route} is public and has no serious or critical automated accessibility violations`, async ({ page }) => {
    await page.route('**/api/nocodebackend/auth/get-session', () => {})
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${route}$`))

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(result.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
  })
}

test('/home exposes labelled search status and a named product-results region', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/home')

  const search = page.getByRole('searchbox', { name: 'Search products, producers or styles' })
  await expect(search).toHaveAttribute('aria-describedby', 'product-search-status')
  await expect(page.locator('#product-search-status')).toHaveAttribute('role', 'status')
  await expect(page.locator('#product-search-status')).toHaveAttribute('aria-atomic', 'true')
  await expect(page.getByRole('heading', { name: 'Product results' })).toBeAttached()
  await expect(page.locator('section[aria-labelledby="product-results-heading"]')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByText('1 product found')).toBeVisible()
})

test('/search announces an empty result without moving keyboard focus from the query', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/catalog/products?**', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('q') !== 'no-match') return route.fallback()

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 })
    })
  })

  await page.goto('/search')
  const search = page.getByRole('searchbox', { name: 'Search products, producers or styles' })
  await expect(search).toBeFocused()

  await search.fill('no-match')

  const searchStatus = page.locator('#product-search-status')
  await expect(searchStatus).toHaveText('0 products found')
  await expect(search).toBeFocused()
  await expect(page.getByRole('heading', { name: 'No matching products' })).toBeVisible()
  await expect(page.getByText('Try a shorter product, producer or style name.')).toBeVisible()
  await expect(page.locator('section[aria-labelledby="product-results-heading"]')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('link', { name: /Ace/ })).toHaveCount(0)
})

for (const route of routes) {
  test(`${route} has no serious or critical automated accessibility violations`, async ({ page }) => {
    await installMockApi(page)
    await page.goto(route)
    await expect(page.locator('main, #main-content').first()).toBeVisible()

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const serious = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
    expect(serious).toEqual([])
  })
}