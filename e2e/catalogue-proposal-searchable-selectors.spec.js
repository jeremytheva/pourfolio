import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const secondProduct = {
  ...product,
  id: 5,
  product_name: 'Dark Matter',
  producer_id: 21,
  product_category_id: 11,
  edition: '2026',
  producer: { id: 21, producer_name: 'Other Brewing' },
  category: { id: 11, category_name: 'Stout' }
}

const installVerifiedRelationshipPage = async (page) => {
  await page.route('**/api/nocodebackend/catalog/products?page=1&limit=50', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [product, secondProduct], page: 1, pageSize: 50, total: 2, totalPages: 1 })
  }))
}

const installDuplicateSearch = async (page) => {
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('q') !== 'Dark Matter') return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [secondProduct], page: 1, pageSize: 24, total: 1, totalPages: 1 })
    })
  })
}

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
  await installVerifiedRelationshipPage(page)
})

test('missing-beer proposal filters verified breweries and styles before review', async ({ page }) => {
  await page.goto('/products/propose?name=New%20Beer')

  await expect(page.getByRole('heading', { name: 'Propose a missing beer' })).toBeVisible()

  const producerSearch = page.getByLabel('Search breweries')
  const producerSelect = page.getByLabel('Brewery / producer')
  await producerSearch.fill('Other')
  await expect(page.locator('#producer-search-status')).toHaveText('1 of 2 verified breweries shown.')
  await expect(producerSelect.locator('option')).toHaveCount(2)
  await producerSelect.selectOption('21')

  const styleSearch = page.getByLabel('Search beer styles')
  const styleSelect = page.getByLabel('Beer style / category')
  await styleSearch.fill('Stout')
  await expect(page.locator('#style-search-status')).toHaveText('1 of 2 verified styles shown.')
  await expect(styleSelect.locator('option')).toHaveCount(2)
  await styleSelect.selectOption('11')

  const reviewButton = page.getByRole('button', { name: 'Review proposal' })
  await expect(reviewButton).toBeDisabled()
  await expect(page.getByText('No likely duplicate was found in the current search results.')).toBeVisible()
  await expect(reviewButton).toBeEnabled()
  await reviewButton.click()

  const review = page.locator('section[aria-labelledby="review-heading"]')
  await expect(review.getByText('Other Brewing')).toBeVisible()
  await expect(review.getByText('Stout')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit for moderation' })).toBeDisabled()
})

test('missing-beer proposal explains style and edition duplicate signals', async ({ page }) => {
  await installDuplicateSearch(page)
  await page.goto('/products/propose?name=Dark%20Matter')

  await page.getByLabel('Brewery / producer').selectOption('21')
  await page.getByLabel('Beer style / category').selectOption('11')
  await page.getByLabel('Edition / vintage').fill('2026')

  const duplicateSection = page.locator('section[aria-labelledby="duplicate-heading"]')
  await expect(duplicateSection.getByText('1 possible duplicate found. Compare the signals below before continuing.')).toBeVisible()
  await expect(duplicateSection.getByRole('link', { name: 'Dark Matter' })).toBeVisible()
  await expect(duplicateSection.getByText('Same brewery · same name · same style · same edition')).toBeVisible()

  await page.getByLabel('Edition / vintage').fill('2025')
  await expect(duplicateSection.getByText('Same brewery · same name · same style · different edition')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review proposal' })).toBeEnabled()
})
