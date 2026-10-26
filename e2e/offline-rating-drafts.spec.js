import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'
import { completeRatingCards } from '../release-check/ratingJourney.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('draft is restored from device storage when the rating-form API is unavailable', async ({ page }) => {
  let uploads = 0
  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    uploads += 1
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ rating: { id: 99 } }) })
  })

  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.getByRole('button', { name: 'Save draft on this device' }).click()
  await expect(page.getByText('Draft saved on this device only.')).toBeVisible()
  expect(uploads).toBe(0)

  await page.route('**/api/nocodebackend/rating-form?**', (route) => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Unavailable' })
  }))
  await page.goto('/products/4/rate')
  await expect(page.getByRole('heading', { name: 'Review your rating' })).toBeVisible()
  await expect(page.getByText('Using a previously saved rating form.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save draft again' })).toBeVisible()
  await expect(page.getByText('4 / 7').first()).toBeVisible()
  expect(uploads).toBe(0)
})

test('offline Submit only saves locally and never calls the rating gateway', async ({ page }) => {
  let uploads = 0
  await page.route('**/api/nocodebackend/ratings/submit', (route) => {
    uploads += 1
    return route.abort()
  })
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
  })
  await page.getByRole('button', { name: 'Submit rating' }).click()
  await expect(page.getByText('Draft saved on this device only.')).toBeVisible()
  await expect(page).toHaveURL(/\/products\/4\/rate$/)
  expect(uploads).toBe(0)
})

test('another signed-in account cannot see the prior owner device draft', async ({ page }) => {
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.getByRole('button', { name: 'Save draft on this device' }).click()
  await expect(page.getByText('Draft saved on this device only.')).toBeVisible()

  await page.route('**/api/nocodebackend/auth/get-session', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'user-2', email: 'other@example.com' } })
  }))
  await page.route('**/api/nocodebackend/rating-form?**', (route) => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Rating form unavailable.' })
  }))
  await page.goto('/products/4/rate')
  await expect(page.getByRole('heading', { name: 'Rating form unavailable' })).toBeVisible()
  await expect(page.getByText('Using a previously saved rating form.')).toHaveCount(0)
})
