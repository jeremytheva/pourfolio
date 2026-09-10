import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('verified product producer links to its brewery and back to the same product', async ({ page }) => {
  await page.goto('/products/4')

  const producerLink = page.getByRole('link', { name: 'Rocky Ridge Brewing' })
  await expect(producerLink).toHaveAttribute('href', '/breweries/20')
  await producerLink.click()

  await expect(page).toHaveURL(/\/breweries\/20$/)
  await expect(page.getByRole('heading', { name: 'Rocky Ridge Brewing', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Beer from this brewery', level: 2 })).toBeVisible()
  await expect(page.getByText('1 product', { exact: true })).toBeVisible()

  const productLink = page.getByRole('link', { name: /Ace/ })
  await expect(productLink).toHaveAttribute('href', '/products/4')
  await productLink.click()
  await expect(page).toHaveURL(/\/products\/4$/)
})

test('brewery page renders only verified producer fields and products', async ({ page }) => {
  await page.goto('/breweries/20')

  await expect(page.getByRole('heading', { name: 'Rocky Ridge Brewing', level: 1 })).toBeVisible()
  await expect(page.getByText('Ace', { exact: true })).toBeVisible()
  await expect(page.getByText(/Brewery X|Napa Valley|Distillery|Taproom|Claim|Suggest Updates/i)).toHaveCount(0)
})

test('non-canonical brewery identifier fails locally without a producer request', async ({ page }) => {
  let producerRequests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/nocodebackend/catalog/producers/020')) producerRequests += 1
  })

  await page.goto('/breweries/020')

  await expect(page.getByRole('heading', { name: 'Brewery unavailable' })).toBeVisible()
  await expect(page.getByText('Producer identifier is invalid.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  expect(producerRequests).toBe(0)
})

test('relationship-inconsistent brewery payload fails closed', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/producers/20', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      producer: { id: 20, producer_name: 'Rocky Ridge Brewing' },
      products: [{
        id: 4,
        product_name: 'Ace',
        producer_id: 21,
        producer: { id: 21, producer_name: 'Other Brewery' },
        producers: [{ id: 21, producer_name: 'Other Brewery' }],
        category: null
      }]
    })
  }))

  await page.goto('/breweries/20')

  await expect(page.getByRole('heading', { name: 'Brewery unavailable' })).toBeVisible()
  await expect(page.getByText('The server returned invalid catalogue data. Please try again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})
