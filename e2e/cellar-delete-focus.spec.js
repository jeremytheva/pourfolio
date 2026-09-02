import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('cellar delete disables the active control and restores focus to the heading when the visible list becomes empty', async ({ page }) => {
  let releaseDelete
  const deleteGate = new Promise((resolve) => { releaseDelete = resolve })

  await page.route('**/api/nocodebackend/cellar/55', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback()
    await deleteGate
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/cellar')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete Ace' }).click()

  const deletingButton = page.getByRole('button', { name: 'Deleting Ace' })
  await expect(deletingButton).toBeDisabled()
  await expect(deletingButton.locator('xpath=ancestor::li')).toHaveAttribute('aria-busy', 'true')

  releaseDelete()
  await expect(page.getByRole('button', { name: /Ace/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'My cellar' })).toBeFocused()
})

test('cellar delete restores focus to an adjacent remaining product', async ({ page }) => {
  const secondProduct = { ...product, id: 5, product_name: 'Bravo' }
  const cellarItem = (id, productRecord) => ({
    id,
    product_id: productRecord.id,
    quantity: 1,
    mls: 375,
    container: 'Bottle',
    purchase_price: 5,
    retail_price: 7,
    date_received: '2026-07-20',
    sharing_series_id: null,
    series_version_id: null,
    notes: 'Launch test',
    product: productRecord
  })

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [cellarItem(55, product), cellarItem(56, secondProduct)] })
    })
  })
  await page.route('**/api/nocodebackend/cellar/55', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback()
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/cellar')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete Ace' }).click()

  await expect(page.getByRole('link', { name: 'Bravo' })).toBeFocused()
})
