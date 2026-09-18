import { expect, test } from '@playwright/test'
import { RATING_DISTRIBUTION_BUCKETS } from '../src/lib/completedRatingContract.js'
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

const emptyRatingInsights = {
  distribution: RATING_DISTRIBUTION_BUCKETS.map((bucket) => ({ ...bucket, count: 0 })),
  attributes: []
}

const createdProduct = {
  ...product,
  id: 6,
  product_name: 'New Beer',
  producer_id: 21,
  product_category_id: 11,
  edition: null,
  producer: { id: 21, producer_name: 'Other Brewing' },
  category: { id: 11, category_name: 'Stout' },
  ratingSummary: { count: 0, average: null },
  ratingInsights: emptyRatingInsights,
  ratings: []
}

const installVerifiedRelationshipPage = async (page) => {
  await page.route('**/api/nocodebackend/catalog/producers?page=1&limit=50', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [product.producer, secondProduct.producer],
      page: 1,
      pageSize: 50,
      total: 2,
      totalPages: 1
    })
  }))
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

const installCreatedProductDetail = async (page, override = {}) => {
  const productPayload = { ...createdProduct, ...override }
  await page.route(`**/api/nocodebackend/catalog/products/${productPayload.id}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(productPayload)
  }))
}

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
  await installVerifiedRelationshipPage(page)
})

test('add beer links an existing verified producer and creates the product', async ({ page }) => {
  let submittedBody
  await installCreatedProductDetail(page)
  await page.route('**/api/nocodebackend/catalog/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ product: createdProduct, producerCreated: false })
    })
  })

  await page.goto('/products/propose?name=New%20Beer')
  await expect(page.getByRole('heading', { name: 'Add a beer' })).toBeVisible()

  const producerSearch = page.getByLabel('Search breweries')
  const producerSelect = page.getByLabel('Select brewery')
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

  const reviewButton = page.getByRole('button', { name: 'Review beer' })
  await expect(reviewButton).toBeDisabled()
  await expect(page.getByText('No likely duplicate was found in the current search results.')).toBeVisible()
  await expect(reviewButton).toBeEnabled()
  await reviewButton.click()

  const review = page.locator('section[aria-labelledby="review-heading"]')
  await expect(review.getByText('Other Brewing')).toBeVisible()
  await expect(review.getByText('Stout')).toBeVisible()
  await page.getByRole('button', { name: 'Add beer to catalogue' }).click()

  await expect(page).toHaveURL(/\/products\/6$/)
  expect(submittedBody.producer_id).toBe('21')
  expect(submittedBody.producers).toEqual([{ producer_id: '21' }])
  expect(submittedBody.collaboration).toBe(false)
  expect(submittedBody.product_category_id).toBe('11')
  expect(submittedBody.product_name).toBe('New Beer')
  expect(submittedBody).not.toHaveProperty('new_producer')
  expect(submittedBody).not.toHaveProperty('user_id')
})

test('add beer can create a missing producer without exposing raw relationship ids', async ({ page }) => {
  let submittedBody
  await installCreatedProductDetail(page, {
    id: 7,
    producer_id: 31,
    producer: { id: 31, producer_name: 'Brand New Brewing' }
  })
  await page.route('**/api/nocodebackend/catalog/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        product: { ...createdProduct, id: 7, producer_id: 31, producer: { id: 31, producer_name: 'Brand New Brewing' } },
        producerCreated: true
      })
    })
  })

  await page.goto('/products/propose?name=New%20Beer')
  await page.getByLabel('Add a brewery').first().check()
  await page.getByLabel('New brewery / producer name').fill('Brand New Brewing')
  await page.getByLabel('Beer style / category').selectOption('11')

  await expect(page.getByLabel(/producer id/i)).toHaveCount(0)
  const reviewButton = page.getByRole('button', { name: 'Review beer' })
  await expect(reviewButton).toBeEnabled()
  await reviewButton.click()
  await expect(page.locator('section[aria-labelledby="review-heading"]').getByText('Brand New Brewing')).toBeVisible()
  await page.getByRole('button', { name: 'Add beer to catalogue' }).click()

  await expect(page).toHaveURL(/\/products\/7$/)
  expect(submittedBody.new_producer).toEqual({ producer_name: 'Brand New Brewing' })
  expect(submittedBody.producers).toEqual([{ new_producer: { producer_name: 'Brand New Brewing' } }])
  expect(submittedBody).not.toHaveProperty('producer_id')
  expect(submittedBody).not.toHaveProperty('user_id')
})

test('add beer supports multiple producers and derives collaboration state', async ({ page }) => {
  let submittedBody
  await installCreatedProductDetail(page, {
    id: 8,
    producer_id: 20,
    collaboration: 1,
    producer: product.producer,
    producers: [product.producer, secondProduct.producer]
  })
  await page.route('**/api/nocodebackend/catalog/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        product: {
          ...createdProduct,
          id: 8,
          producer_id: 20,
          collaboration: 1,
          producer: product.producer,
          producers: [product.producer, secondProduct.producer]
        },
        producerCreated: false,
        producersCreated: 0
      })
    })
  })

  await page.goto('/products/propose?name=New%20Beer')
  await page.getByLabel('Select brewery').selectOption('20')
  await page.getByRole('button', { name: 'Add collaborating brewery' }).click()
  await page.getByLabel('Collaborating brewery 2 existing producer').selectOption('21')
  await page.getByLabel('Beer style / category').selectOption('11')

  await expect(page.getByText('2 producers will be linked. This beer will be recorded as a collaboration.')).toBeVisible()
  await page.getByRole('button', { name: 'Review beer' }).click()
  const review = page.locator('section[aria-labelledby="review-heading"]')
  await expect(review.getByText('Rocky Ridge Brewing')).toBeVisible()
  await expect(review.getByText('Other Brewing')).toBeVisible()
  await expect(review.getByText('Yes')).toBeVisible()
  await page.getByRole('button', { name: 'Add beer to catalogue' }).click()

  await expect(page).toHaveURL(/\/products\/8$/)
  expect(submittedBody.producer_id).toBe('20')
  expect(submittedBody.producers).toEqual([{ producer_id: '20' }, { producer_id: '21' }])
  expect(submittedBody.collaboration).toBe(true)
  expect(submittedBody).not.toHaveProperty('user_id')
})

test('add beer explains style and edition duplicate signals', async ({ page }) => {
  await installDuplicateSearch(page)
  await page.goto('/products/propose?name=Dark%20Matter')

  await page.getByLabel('Select brewery').selectOption('21')
  await page.getByLabel('Beer style / category').selectOption('11')
  await page.getByLabel('Edition / vintage').fill('2026')

  const duplicateSection = page.locator('section[aria-labelledby="duplicate-heading"]')
  await expect(duplicateSection.getByText('1 possible duplicate found. Compare the signals below before continuing.')).toBeVisible()
  await expect(duplicateSection.getByRole('link', { name: 'Dark Matter' })).toBeVisible()
  await expect(duplicateSection.getByText('Same primary brewery · same name · same style · same edition')).toBeVisible()

  await page.getByLabel('Edition / vintage').fill('2025')
  await expect(duplicateSection.getByText('Same primary brewery · same name · same style · different edition')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review beer' })).toBeEnabled()
})
