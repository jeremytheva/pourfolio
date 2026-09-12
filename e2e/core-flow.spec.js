import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

const completeRatingDeck = async (page, { designSkipped = false } = {}) => {
  if (!designSkipped) {
    await expect(page.getByRole('heading', { name: 'Design', level: 2 })).toBeVisible()
    await page.getByRole('button', { name: 'Skip this attribute' }).click()
    await expect(page.getByRole('heading', { name: 'Appearance', level: 2 })).toBeFocused()
  }

  await page.getByRole('button', { name: 'Appearance: 1 out of 7' }).click()
  await expect(page.getByRole('heading', { name: 'Aroma', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: /Bonus attributes for Aroma/ }).click()
  await page.getByRole('checkbox', { name: /Aroma pop/ }).check()
  await page.getByRole('button', { name: 'Aroma: 7 out of 7' }).click()
  await expect(page.getByRole('heading', { name: 'Mouthfeel', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: 'Mouthfeel: 7 out of 7' }).click()
  await expect(page.getByRole('heading', { name: 'Flavour', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: 'Flavour: 7 out of 7' }).click()
  await expect(page.getByRole('heading', { name: 'Follow', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: /Bonus attributes for Follow/ }).click()
  await page.getByRole('checkbox', { name: /Long finish/ }).check()
  await page.getByRole('button', { name: 'Follow: 7 out of 7' }).click()
  await expect(page.getByRole('heading', { name: 'Burp', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await expect(page.getByRole('heading', { name: 'All bonus attributes', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: /^Overall/ }).click()
  await page.getByRole('checkbox', { name: /Style wow/ }).check()
  await expect(page.getByText('2 / 2', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: 'Review your rating', level: 2 })).toBeFocused()
}

const oneRatingInsights = {
  distribution: [
    { score: 0, count: 0 },
    { score: 1, count: 0 },
    { score: 2, count: 0 },
    { score: 3, count: 0 },
    { score: 4, count: 1 },
    { score: 5, count: 0 }
  ],
  attributes: []
}

test('catalogue to product to rating derives Bonus from selected attributes', async ({ page }) => {
  let submitted = null
  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ rating: { id: 99 }, scoreCount: 6, bonusCount: 3, bonusPointTotal: 2.1, bonusScore: 2, duplicate: false })
    })
  })

  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
  await page.locator('a[href="/products/4"]').click()
  await expect(page).toHaveURL(/\/products\/4$/)
  await page.getByRole('link', { name: 'Rate this beer' }).click()

  await completeRatingDeck(page)
  await expect(page.getByText('4.57 / 5').first()).toBeVisible()
  await page.getByRole('button', { name: 'Submit rating' }).click()

  await expect(page).toHaveURL(/\/products\/4$/)
  expect(submitted.productId).toBe('4')
  expect(submitted.scores).toEqual([
    { attributeId: 2, score: 1 },
    { attributeId: 3, score: 7 },
    { attributeId: 4, score: 7 },
    { attributeId: 5, score: 7 },
    { attributeId: 6, score: 7 }
  ])
  expect(submitted.scores.some((score) => score.attributeId === 7)).toBe(false)
  expect(submitted.bonusAttributeIds).toEqual(['10', '11', '12'])
  expect(submitted.weights).toEqual({
    appearance: 0.1,
    aroma: 0.1,
    mouthfeel: 0.2,
    flavour: 0.25,
    follow: 0.25,
    bonus: 0.1
  })
  expect(Number.isSafeInteger(submitted.submissionId)).toBe(true)
})

test('rating form preserves accessible guidance and focused submission errors with derived Bonus', async ({ page }) => {
  let releaseSubmission
  const submissionGate = new Promise((resolve) => { releaseSubmission = resolve })

  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    await submissionGate
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rating service unavailable.' })
    })
  })

  await page.goto('/products/4/rate')

  const scoreGroup = page.getByRole('group', { name: 'Applicable attributes' })
  await expect(scoreGroup).toHaveAttribute('aria-describedby', 'rating-required-help')
  await expect(page.getByRole('slider', { name: 'Design score' })).toHaveAttribute('aria-describedby', 'score-8-weight rating-required-help')
  await expect(page.getByRole('button', { name: 'Skip this attribute' })).toBeEnabled()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await expect(page.getByRole('heading', { name: 'Appearance', level: 2 })).toBeFocused()
  await expect(page.getByRole('slider', { name: 'Appearance score' })).toHaveAttribute('aria-describedby', 'score-2-weight rating-required-help')
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()

  await completeRatingDeck(page, { designSkipped: true })
  await expect(page.locator('section[role="status"]')).toHaveAttribute('aria-atomic', 'true')
  await expect(page.getByText('4.57 / 5').first()).toBeVisible()

  await page.getByRole('button', { name: 'Submit rating' }).click()
  const form = page.locator('form')
  const submittingButton = page.getByRole('button', { name: 'Submitting securely…' })
  await expect(form).toHaveAttribute('aria-busy', 'true')
  await expect(submittingButton).toHaveAttribute('aria-busy', 'true')
  await expect(submittingButton).toBeDisabled()

  releaseSubmission()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Rating service unavailable.')
  await expect(alert).toBeFocused()
  await expect(form).toHaveAttribute('aria-busy', 'false')
})

test('product details render an aggregate-only rating response', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...product,
      ratingSummary: { count: 1, average: 4 },
      ratingInsights: oneRatingInsights,
      ratings: []
    })
  }))

  await page.goto('/products/4')

  await expect(page.getByRole('heading', { name: 'Ace' })).toBeVisible()
  const communityRating = page.getByRole('region', { name: 'Community rating' })
  await expect(page.getByRole('heading', { name: 'Community rating' })).toBeVisible()
  await expect(communityRating.getByText('1 rating', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0)
})

test('malformed successful product data uses the recoverable error state', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ...product, ratingSummary: { count: 1, average: null } })
  }))

  await page.goto('/products/4')

  await expect(page.getByRole('heading', { name: 'Product unavailable' })).toBeVisible()
  await expect(page.getByText('The server returned invalid catalogue data. Please try again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0)
})

test('malformed successful catalogue data announces failure instead of a false result count', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{ id: 0 }], page: 1, pageSize: 24, total: 1, totalPages: 1 })
  }))

  await page.goto('/home')

  await expect(page.getByRole('alert').getByText('Products are unavailable')).toBeVisible()
  await expect(page.getByText('The server returned invalid catalogue data. Please try again.')).toBeVisible()
  await expect(page.getByText('Products could not be loaded.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByText(/products? found/)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0)
})

test('a non-canonical product route fails before a catalogue request', async ({ page }) => {
  let productRequests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/nocodebackend/catalog/products/04')) productRequests += 1
  })

  await page.goto('/products/04')

  await expect(page.getByRole('heading', { name: 'Product unavailable' })).toBeVisible()
  await expect(page.getByText('Product identifier is invalid.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to products' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  expect(productRequests).toBe(0)
})

test('an exact missing product route uses the recoverable not-found state', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/999', (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Product not found.' })
  }))

  await page.goto('/products/999')

  await expect(page.getByRole('heading', { name: 'Product unavailable' })).toBeVisible()
  await expect(page.getByText('Product not found.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to products' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0)
})

test('cellar records load, update and delete through server endpoints', async ({ page }) => {
  await page.goto('/cellar')
  await expect(page.getByRole('heading', { name: 'My cellar' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ace' })).toBeVisible()

  await page.getByRole('button', { name: 'Edit Ace' }).click()
  await page.getByLabel('Quantity').fill('3')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(/Quantity 3/)).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete Ace' }).click()
  await expect(page.getByText('Your cellar is empty')).toBeVisible()
})

test('profile exposes session-backed identity without unavailable persistence controls', async ({ page }) => {
  let profilePutRequests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/nocodebackend/profile') && request.method() === 'PUT') profilePutRequests += 1
  })

  await page.goto('/profile')

  const profile = page.locator('section[aria-labelledby="profile-details"]')
  await expect(page.getByRole('heading', { name: 'Profile and rating history' })).toBeVisible()
  await expect(profile.getByText('Jeremy', { exact: true }).first()).toBeVisible()
  await expect(profile.getByText('jeremy@example.com', { exact: true }).first()).toBeVisible()
  await expect(profile.getByText('Profile editing is not available yet.')).toBeVisible()
  await expect(profile.getByRole('button', { name: /save profile/i })).toHaveCount(0)
  await expect(profile.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByLabel(/role/i)).toHaveCount(0)
  await expect(page.getByText('4 / 5')).toBeVisible()
  expect(profilePutRequests).toBe(0)
})
