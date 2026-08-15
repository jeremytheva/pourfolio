import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('catalogue to product to rating uses stable IDs and accepts score 1', async ({ page }) => {
  let submitted = null
  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ rating: { id: 99 }, scoreCount: 2, bonusCount: 0, duplicate: false })
    })
  })

  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
  await page.getByRole('link', { name: 'View product' }).click()
  await expect(page).toHaveURL(/\/products\/4$/)
  await page.getByRole('link', { name: 'Rate this beer' }).click()

  await page.getByRole('combobox', { name: /Appearance/ }).selectOption('1')
  await page.getByRole('combobox', { name: /Aroma/ }).selectOption('7')
  await expect(page.getByText('4 / 7').first()).toBeVisible()
  await page.getByRole('button', { name: 'Submit rating' }).click()

  await expect(page).toHaveURL(/\/products\/4$/)
  expect(submitted.productId).toBe('4')
  expect(submitted.scores).toEqual([
    { attributeId: 2, score: 1 },
    { attributeId: 3, score: 7 }
  ])
  expect(Number.isSafeInteger(submitted.submissionId)).toBe(true)
})

test('product details render an aggregate-only rating response', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...product,
      ratingSummary: { count: 1, average: 4 }
    })
  }))

  await page.goto('/products/4')

  await expect(page.getByRole('heading', { name: 'Ace' })).toBeVisible()
  await expect(page.getByText('No ratings yet. Be the first to rate this product.')).toBeVisible()
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

test('profile exposes editable display fields but no browser role control', async ({ page }) => {
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Profile and rating history' })).toBeVisible()
  await expect(page.getByLabel('Display name')).toHaveValue('Jeremy')
  await expect(page.getByText('Account identity and role are not editable from the browser.')).toBeVisible()
  await expect(page.getByLabel(/role/i)).toHaveCount(0)
  await expect(page.getByText('4 / 7')).toBeVisible()
})
