import { expect, test } from '@playwright/test'
import { completeRatingCards } from '../release-check/ratingJourney.js'
import { installMockApi, submissionReceipt } from './mockApi.js'

test.beforeEach(async ({ page }) => { await installMockApi(page) })

const submitReviewedRating = async (page) => {
  const requests = []
  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(submissionReceipt(route.request().postDataJSON())) })
  })
  await page.goto('/products/4/rate')
  const result = await completeRatingCards(page)
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect(page).toHaveURL(/\/products\/4$/)
  expect(requests).toHaveLength(1)
  return { result, submitted: requests[0] }
}

test('connected driver reaches review through real Design, Burp and All bonus cards before one submit', async ({ page }) => {
  const { result, submitted } = await submitReviewedRating(page)
  expect(result).toEqual({ manualScoreCount: 5, selectedBonusCount: 1 })
  expect(submitted.scores).toEqual([2, 3, 4, 5, 6].map((attributeId) => ({ attributeId, score: 4 })))
  expect(submitted.bonusAttributeIds).toEqual(['12'])
})

test('connected driver respects a personalised zero-weight card without fabricating its score', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('brewBudsSettings_beer', JSON.stringify({
      settingsVersion: 2,
      ratingWeights: { appearance: 0, aroma: 0.2, mouthfeel: 0.2, flavour: 0.25, follow: 0.25, bonus: 0.1 }
    }))
  })
  const { result, submitted } = await submitReviewedRating(page)
  expect(result).toEqual({ manualScoreCount: 4, selectedBonusCount: 1 })
  expect(submitted.scores).toEqual([3, 4, 5, 6].map((attributeId) => ({ attributeId, score: 4 })))
  expect(submitted.weights.appearance).toBe(0)
  expect(submitted.bonusAttributeIds).toEqual(['12'])
})
