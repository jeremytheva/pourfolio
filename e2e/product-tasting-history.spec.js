import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('product page shows private repeat tasting history newest first', async ({ page }) => {
  let requestedProductId = null
  await page.route('**/api/nocodebackend/ratings/mine**', async (route) => {
    const url = new URL(route.request().url())
    requestedProductId = url.searchParams.get('product_id')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 102,
            product_id: 4,
            date_rated: '2026-09-21T00:00:00.000Z',
            total_weighted: 4.48,
            product,
            advanced_scores: {
              score_out_of_100: 89.6,
              scaled_score: 84,
              style_scaled_score: 91,
              style_sample_size: 32,
              retail_ppp: null,
              purchased_ppp: null
            }
          },
          {
            id: 101,
            product_id: 4,
            date_rated: '2025-06-18T00:00:00.000Z',
            total_weighted: 4.26,
            product,
            advanced_scores: {
              score_out_of_100: 85.2,
              scaled_score: 76,
              style_scaled_score: 81,
              style_sample_size: 28,
              retail_ppp: null,
              purchased_ppp: null
            }
          }
        ]
      })
    })
  })

  await page.goto('/products/4')

  await expect.poll(() => requestedProductId).toBe('4')
  const history = page.getByRole('region', { name: 'Your tasting history' })
  await expect(history).toContainText('21 Sept 2026')
  await expect(history).toContainText('4.48 / 5')
  await expect(history).toContainText('18 June 2025')
  await expect(history).toContainText('4.26 / 5')
  await expect(history).toContainText('Overall Scaled Score')
  await expect(history).toContainText('Style Scaled Score')

  const entries = history.getByRole('listitem')
  await expect(entries).toHaveCount(2)
  await expect(entries.nth(0)).toContainText('21 Sept 2026')
  await expect(entries.nth(1)).toContainText('18 June 2025')
})

test('owner history failure does not hide community product details and can be retried', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/nocodebackend/ratings/mine**', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rating history unavailable.' })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] })
    })
  })

  await page.goto('/products/4')

  await expect(page.getByRole('heading', { name: 'Community rating' })).toBeVisible()
  const alert = page.getByRole('alert').filter({ hasText: 'Rating history unavailable.' })
  await expect(alert).toBeVisible()

  await page.getByRole('button', { name: 'Retry tasting history' }).click()
  await expect(page.getByText('You have not completed a Full Tasting for this beer yet.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Community rating' })).toBeVisible()
  expect(attempts).toBe(2)
})
