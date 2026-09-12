import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const installVerifiedRelationshipPage = async (page) => {
  await page.route('**/api/nocodebackend/catalog/products?page=1&limit=50', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [product], page: 1, pageSize: 50, total: 1, totalPages: 1 })
  }))
}

const sameEditionConflict = {
  ...product,
  id: 5,
  product_name: 'Ace Reserve',
  edition: '2026'
}

const differentEditionConflict = {
  ...product,
  id: 6,
  product_name: 'Ace Reserve Barrel',
  edition: '2025'
}

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
  await installVerifiedRelationshipPage(page)
})

test('product detail correction flow preserves product identity and remains non-mutating', async ({ page }) => {
  const catalogueMutations = []
  page.on('request', (request) => {
    if (!request.url().includes('/api/nocodebackend/catalog/')) return
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) catalogueMutations.push(request.method())
  })

  await page.goto('/products/4')

  const correctionLink = page.getByRole('link', { name: 'Suggest correction' })
  await expect(correctionLink).toBeVisible()
  await correctionLink.click()
  await expect(page).toHaveURL(/\/products\/4\/propose-edit$/)

  await expect(page.getByRole('heading', { name: 'Suggest a correction' })).toBeVisible()
  await expect(page.getByText('Stable product ID: 4')).toBeVisible()
  await expect(page.getByLabel('Beer name')).toHaveValue('Ace')
  await expect(page.getByLabel('Brewery / producer')).toHaveValue('20')
  await expect(page.getByLabel('Beer style / category')).toHaveValue('10')
  await expect(page.getByLabel('ABV %')).toHaveValue('5.2')
  await expect(page.getByLabel('IBU')).toHaveValue('35')

  await page.getByLabel('Search breweries').fill('Rocky')
  await expect(page.locator('#correction-producer-search-status')).toHaveText('1 of 1 verified breweries shown.')
  await page.getByLabel('Search beer styles').fill('Pale')
  await expect(page.locator('#correction-style-search-status')).toHaveText('1 of 1 verified styles shown.')

  const reviewButton = page.getByRole('button', { name: 'Review changes' })
  await expect(reviewButton).toBeDisabled()

  await page.route(/\/api\/nocodebackend\/catalog\/products\?.*q=/, (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('q') !== 'Ace Reserve') return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [product, sameEditionConflict, differentEditionConflict], page: 1, pageSize: 24, total: 3, totalPages: 1 })
    })
  })

  await page.getByLabel('Beer name').fill('Ace Reserve')
  await page.getByLabel('Edition / vintage').fill('2026')

  const conflictSection = page.locator('section[aria-labelledby="correction-duplicate-heading"]')
  await expect(conflictSection.getByText('2 possible conflicting products found.')).toBeVisible()
  await expect(conflictSection.getByRole('link', { name: 'Ace', exact: true })).toHaveCount(0)
  await expect(conflictSection.getByRole('link', { name: 'Ace Reserve', exact: true })).toBeVisible()
  await expect(conflictSection.getByText('Exact name · Same style · Same edition')).toBeVisible()
  await expect(conflictSection.getByRole('link', { name: 'Ace Reserve Barrel', exact: true })).toBeVisible()
  await expect(conflictSection.getByText('Similar name · Same style · Different edition')).toBeVisible()

  await expect(reviewButton).toBeEnabled()
  await reviewButton.click()

  const review = page.locator('section[aria-labelledby="correction-review-heading"]')
  await expect(review.getByRole('heading', { name: 'Review proposed corrections' })).toBeVisible()
  await expect(review.getByText('Product ID 4 remains unchanged.')).toBeVisible()
  await expect(review.getByText('Beer name')).toBeVisible()
  await expect(review.getByText('Edition / vintage')).toBeVisible()
  const values = review.locator('dd > span')
  await expect(values.nth(0)).toContainText('Current')
  await expect(values.nth(0)).toContainText('Ace')
  await expect(values.nth(1)).toContainText('Proposed')
  await expect(values.nth(1)).toContainText('Ace Reserve')
  await expect(review.locator('dt')).toHaveCount(2)

  await expect(page.getByRole('button', { name: 'Submit correction for moderation' })).toBeDisabled()
  expect(catalogueMutations).toEqual([])
})
