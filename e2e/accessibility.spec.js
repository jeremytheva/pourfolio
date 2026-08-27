import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

const routes = ['/home', '/products/4', '/products/4/rate', '/cellar', '/profile']
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