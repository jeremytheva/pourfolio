import { expect, test } from '@playwright/test'
import { RATING_DISTRIBUTION_BUCKETS } from '../src/lib/completedRatingContract.js'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('product details preserve a valid zero IBU value', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...product,
      ibu: 0,
      ratingSummary: { count: 1, average: 4 },
      ratingInsights: {
        distribution: RATING_DISTRIBUTION_BUCKETS.map((bucket) => ({
          ...bucket,
          count: bucket.key === '3.5-4.0' ? 1 : 0
        })),
        attributes: []
      },
      ratings: []
    })
  }))

  await page.goto('/products/4')

  const ibuLabel = page.getByText('IBU', { exact: true })
  await expect(ibuLabel).toBeVisible()
  await expect(ibuLabel.locator('xpath=following-sibling::dd')).toHaveText('0')
})
