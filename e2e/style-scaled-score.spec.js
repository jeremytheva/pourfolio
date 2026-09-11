import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const ratingWithAdvancedScores = (advancedScores) => ({
  id: 99,
  rating_id: 1700000000000001,
  product_id: product.id,
  cellar_id: null,
  date_rated: '2026-09-11T00:00:00.000Z',
  total_unweighted: 4,
  total_weighted: 4,
  advanced_scores: advancedScores,
  product
})

test('owner rating history distinguishes Overall and Style Scaled Score', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [ratingWithAdvancedScores({
        score_out_of_100: 80,
        scaled_score: 62.5,
        style_scaled_score: 75,
        style_sample_size: 12,
        style_id: '10',
        retail_ppp: 42.86,
        purchased_ppp: 50
      })]
    })
  }))

  await page.goto('/profile')

  const history = page.getByRole('list', { name: 'Rating history' })
  await expect(history.getByText('Overall Scaled Score')).toBeVisible()
  await expect(history.getByText('62.5')).toBeVisible()
  await expect(history.getByText('Style Scaled Score')).toBeVisible()
  await expect(history.getByText('75', { exact: true })).toBeVisible()
  await expect(history.getByText('Compared with 12 ratings in this style')).toBeVisible()
})

test('owner rating history shows Style Scaled Score as unavailable without a verified style', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [ratingWithAdvancedScores({
        score_out_of_100: 80,
        scaled_score: 62.5,
        style_scaled_score: null,
        style_sample_size: 0,
        style_id: null,
        retail_ppp: null,
        purchased_ppp: null
      })]
    })
  }))

  await page.goto('/profile')

  const styleLabel = page.getByText('Style Scaled Score')
  await expect(styleLabel).toBeVisible()
  await expect(styleLabel.locator('..')).toContainText('—')
  await expect(page.getByText(/Compared with .* in this style/)).toHaveCount(0)
})
