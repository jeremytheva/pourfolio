import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test('owner rating history distinguishes overall and style scaled scores', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{
        id: 99,
        rating_id: 1700000000000001,
        product_id: product.id,
        cellar_id: null,
        date_rated: '2026-09-01T00:00:00.000Z',
        total_unweighted: 4,
        total_weighted: 4,
        product,
        advanced_scores: {
          score_out_of_100: 80,
          scaled_score: 50,
          style_scaled_score: 75,
          style_sample_size: 3,
          style_rank_text_eligible: false,
          style_id: '10',
          retail_ppp: null,
          purchased_ppp: null
        }
      }]
    })
  }))

  await page.goto('/profile')

  const history = page.getByRole('list', { name: 'Rating history' })
  await expect(history.getByText('Overall Scaled Score', { exact: true }).locator('..')).toContainText('50')
  await expect(history.getByText('Style Scaled Score', { exact: true }).locator('..')).toContainText('75')
  await expect(history.getByText(/\(3 style ratings\)/)).toBeVisible()
  await expect(history.getByText(/Top \d+%/)).toHaveCount(0)

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(result.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
})

test('owner rating history shows style score as unavailable when style identity is unverified', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{
        id: 99,
        product_id: product.id,
        date_rated: '2026-09-01T00:00:00.000Z',
        total_unweighted: 4,
        total_weighted: 4,
        product: { ...product, product_category_id: null, category: null },
        advanced_scores: {
          score_out_of_100: 80,
          scaled_score: 50,
          style_scaled_score: null,
          style_sample_size: 0,
          style_rank_text_eligible: false,
          style_id: null,
          retail_ppp: null,
          purchased_ppp: null
        }
      }]
    })
  }))

  await page.goto('/profile')
  const styleScore = page.getByText('Style Scaled Score', { exact: true }).locator('..')
  await expect(styleScore).toContainText('—')
  await expect(page.getByText(/style ratings/)).toHaveCount(0)
})
