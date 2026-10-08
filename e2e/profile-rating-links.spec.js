import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const makeRatings = (count = 25) => Array.from({ length: count }, (_, index) => ({
  id: 200 - index,
  rating_id: 1700000000000000 + index,
  product_id: product.id,
  date_rated: index >= 20 ? new Date(Date.UTC(2025, 5, 18 - (index - 20))).toISOString() : new Date(Date.UTC(2026, 8, 25 - index)).toISOString(),
  total_weighted: index === 20 ? 3 : 4,
  product
}))

const historyPayload = (rows, url) => {
  const selected = url.searchParams.get('rating_id')
  const index = rows.findIndex((item) => String(item.id) === selected)
  const page = selected ? Math.floor(index / 20) + 1 : Number(url.searchParams.get('page') || 1)
  return {
    items: rows.slice((page - 1) * 20, page * 20), page, pageSize: 20, total: rows.length,
    totalPages: Math.ceil(rows.length / 20),
    summary: { count: rows.length, averageWeighted: rows.length ? Number((rows.reduce((sum, item) => sum + item.total_weighted, 0) / rows.length).toFixed(2)) : null }
  }
}

test.beforeEach(async ({ page }) => { await installMockApi(page) })

test('each beer-page tasting links to its exact private profile entry, including an older page and reload', async ({ page }) => {
  const rows = makeRatings()
  const requests = []
  await page.route('**/api/nocodebackend/ratings/mine**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ items: [rows[0], rows[20]] })
  }))
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => {
    const url = new URL(route.request().url())
    requests.push(url.searchParams.get('rating_id'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(historyPayload(rows, url)) })
  })
  await page.goto('/products/4')
  const history = page.getByRole('region', { name: 'Your tasting history' })
  await expect(history.getByRole('link').nth(0)).toHaveAttribute('href', '/profile?rating=200')
  const olderLink = history.getByRole('link', { name: 'View my rating from 18 June 2025 in profile' })
  await expect(olderLink).toHaveAttribute('href', '/profile?rating=180')
  await olderLink.click()
  await expect(page).toHaveURL(/\/profile\?rating=180$/)
  await expect(page.locator('#rating-180')).toBeFocused()
  await expect(page.locator('#rating-180')).toContainText('18 June 2025')
  await expect(page.locator('#rating-180')).toContainText('3 / 5')
  await expect(page.getByRole('navigation', { name: 'Rating history pages' })).toContainText('Page 2 of 2 · 25 ratings')
  await expect(page.getByText('3.96 / 5', { exact: true })).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
  await page.reload()
  await expect(page.locator('#rating-180')).toBeFocused()
  expect(requests).toEqual(['180', '180'])
  await page.goBack()
  await history.getByRole('link').nth(0).click()
  await expect(page.locator('#rating-200')).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Rating history pages' })).toContainText('Page 1 of 2 · 25 ratings')
})

test('profile pagination preserves the whole-history average and browser back navigation', async ({ page }) => {
  const rows = makeRatings()
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(historyPayload(rows, new URL(route.request().url())))
  }))
  await page.goto('/profile')
  await expect(page.getByRole('list', { name: 'Rating history' }).getByRole('listitem')).toHaveCount(20)
  await expect(page.getByRole('button', { name: 'Previous ratings' })).toBeDisabled()
  await page.getByRole('button', { name: 'Next ratings' }).click()
  await expect(page).toHaveURL(/page=2$/)
  await expect(page.getByRole('list', { name: 'Rating history' }).getByRole('listitem')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: 'My ratings' })).toBeFocused()
  await expect(page.getByText('3.96 / 5', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next ratings' })).toBeDisabled()
  await page.goBack()
  await expect(page.locator('#rating-200')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Rating history' }).getByRole('listitem')).toHaveCount(20)
})

test('a failed linked history read retries the same older rating and restores focus to it', async ({ page }) => {
  const rows = makeRatings()
  let attempts = 0
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => {
    const url = new URL(route.request().url())
    expect(url.searchParams.get('rating_id')).toBe('180')
    attempts += 1
    return attempts === 1
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Rating history unavailable.' }) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(historyPayload(rows, url)) })
  })
  await page.goto('/profile?rating=180')
  await expect(page.getByRole('alert')).toBeFocused()
  await page.getByRole('button', { name: 'Retry rating history' }).click()
  await expect(page.locator('#rating-180')).toBeFocused()
  expect(attempts).toBe(2)
})

test('an unavailable private link gives a safe recovery to the current account history', async ({ page }) => {
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => new URL(route.request().url()).searchParams.has('rating_id')
    ? route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'rating_not_found', error: 'That rating is not available in your history.' }) })
    : route.fallback())
  await page.goto('/profile?rating=180')
  await expect(page.getByRole('alert')).toContainText('That rating is not available in your history.')
  await expect(page.getByRole('list', { name: 'Rating history' })).toHaveCount(0)
  await page.getByRole('link', { name: 'View all my ratings' }).click()
  await expect(page.locator('#rating-99')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('a late page response cannot overwrite history after navigating back', async ({ page }) => {
  const rows = makeRatings()
  let releasePage
  let requestedDelayedPage = false
  const gate = new Promise((resolve) => { releasePage = resolve })
  await page.route('**/api/nocodebackend/ratings/history?**', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('page') === '2') {
      requestedDelayedPage = true
      await gate
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(historyPayload(rows, url)) })
  })
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Next ratings' }).click()
  await expect.poll(() => requestedDelayedPage).toBe(true)
  await page.goBack()
  await expect(page.locator('#rating-200')).toBeVisible()
  const staleResponse = page.waitForResponse((response) => response.url().includes('/ratings/history?page=2'))
  releasePage()
  await (await staleResponse).finished()
  await expect(page.locator('#rating-200')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Rating history pages' })).toContainText('Page 1 of 2')
  await expect(page.locator('#rating-180')).toHaveCount(0)
})

test('deleting the selected last entry on an older page clears the link and refreshes counts and average', async ({ page }) => {
  let rows = makeRatings(21)
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(historyPayload(rows, new URL(route.request().url())))
  }))
  await page.route('**/api/nocodebackend/ratings/180', (route) => {
    expect(route.request().method()).toBe('DELETE')
    rows = rows.filter((item) => item.id !== 180)
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/profile?rating=180')
  await expect(page.locator('#rating-180')).toBeFocused()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete rating for Ace' }).click()
  await expect(page).toHaveURL(/\/profile\?page=1$/)
  await expect(page.locator('#rating-180')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Rating history pages' })).toContainText('Page 1 of 1 · 20 ratings')
  await expect(page.getByText('4.00 / 5', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'My ratings' })).toBeFocused()
})
