import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('cellar load failure is focused and retry recovers focus to My cellar', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    attempts += 1
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cellar load unavailable.' })
      })
    }
    return route.fallback()
  })

  await page.goto('/cellar')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Cellar load unavailable.')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  const cellarHeading = page.getByRole('heading', { level: 1, name: 'My cellar' })
  await expect(page.getByRole('list', { name: 'Cellar items' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ace' })).toBeVisible()
  await expect(cellarHeading).toBeFocused()
  await expect(alert).toHaveCount(0)
})

test('failed cellar retry returns focus to the load error alert', async ({ page }) => {
  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Cellar load unavailable.' })
    })
  })

  await page.goto('/cellar')

  const alert = page.getByRole('alert')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(alert).toContainText('Cellar load unavailable.')
  await expect(alert).toBeFocused()
})

test('large cellar renders its final item and recovers completely after load failure', async ({ page }) => {
  const items = Array.from({ length: 205 }, (_, index) => ({
    id: index + 1, product_id: index + 1, quantity: 0, gift: false,
    purchase_price: 0, retail_price: null, sharing_series_id: null, series_version_id: null,
    product: { id: index + 1, product_name: `Cellar fixture ${index + 1}`, producer: null, category: null }
  }))
  let fail = false
  await page.route('**/api/nocodebackend/cellar', route => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      status: fail ? 502 : 200, contentType: 'application/json',
      body: JSON.stringify(fail ? { error: 'The complete cellar could not be verified.' } : { items })
    })
  })
  await page.goto('/cellar')
  const list = page.getByRole('list', { name: 'Cellar items' })
  await expect(list.getByRole('listitem')).toHaveCount(205)
  await page.getByRole('searchbox', { name: 'Search cellar' }).fill('Cellar fixture 205')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await expect(list.getByRole('link', { name: 'Cellar fixture 205', exact: true })).toBeVisible()

  fail = true
  await page.reload()
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(list).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(205)
  await expect(page.getByRole('heading', { level: 1, name: 'My cellar' })).toBeFocused()
})
