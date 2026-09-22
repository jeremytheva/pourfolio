import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const advanced = {
  score_out_of_100: 88,
  scaled_score: 80,
  style_scaled_score: 90,
  style_sample_size: 25,
  retail_ppp: null,
  purchased_ppp: null
}

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('Historical Feed is private, filterable and paginated with focus restoration', async ({ page }) => {
  const requests = []
  await page.route('**/api/nocodebackend/ratings/history?**', async (route) => {
    const url = new URL(route.request().url())
    const pageNumber = Number(url.searchParams.get('page') || 1)
    requests.push({
      page: pageNumber,
      q: url.searchParams.get('q'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to')
    })

    const items = pageNumber === 1
      ? [{
          id: 201,
          product_id: 4,
          date_rated: '2026-09-21T00:00:00.000Z',
          total_weighted: 4.5,
          event_type: 'full_tasting',
          product,
          advanced_scores: advanced
        }]
      : [{
          id: 200,
          product_id: 4,
          date_rated: '2025-06-18T00:00:00.000Z',
          total_weighted: 4.2,
          event_type: 'full_tasting',
          product,
          advanced_scores: advanced
        }]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, page: pageNumber, pageSize: 1, total: 2, totalPages: 2 })
    })
  })

  await page.goto('/history')

  await expect(page.getByRole('heading', { name: 'Historical Feed' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('list', { name: 'Historical tasting events' })).toContainText('Ace')
  await expect(page.getByRole('list', { name: 'Historical tasting events' })).toContainText('Rocky Ridge Brewing')
  await expect(page.getByRole('list', { name: 'Historical tasting events' })).toContainText('4.5 / 5')

  await page.getByRole('searchbox', { name: 'Search beer or brewery' }).fill('Rocky Ridge')
  await page.getByLabel('From').fill('2025-01-01')
  await page.getByLabel('To').fill('2026-12-31')
  await page.getByRole('button', { name: 'Apply filters' }).click()

  await expect.poll(() => requests.at(-1)).toEqual({
    page: 1,
    q: 'Rocky Ridge',
    from: '2025-01-01',
    to: '2026-12-31'
  })
  await expect(page.getByRole('heading', { name: 'Tasting events' })).toBeFocused()

  await page.getByRole('button', { name: 'Next history page, page 2' }).click()
  await expect.poll(() => requests.at(-1)?.page).toBe(2)
  await expect(page.getByRole('heading', { name: 'Tasting events' })).toBeFocused()
  await expect(page.getByText('18 June 2025')).toBeVisible()
})

test('Historical Feed failure is isolated and retryable', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/nocodebackend/ratings/history?**', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Historical Feed unavailable.' })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 })
    })
  })

  await page.goto('/history')
  await expect(page.getByRole('alert')).toContainText('Historical Feed unavailable.')

  await page.getByRole('button', { name: 'Retry Historical Feed' }).click()

  await expect(page.getByRole('heading', { name: 'No tasting history yet' })).toBeVisible()
  expect(attempts).toBe(2)
})
