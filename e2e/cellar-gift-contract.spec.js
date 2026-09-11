import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('add-to-cellar submits backend gift fields and clears stale gift_from values', async ({ page }) => {
  let submittedPayload = null

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ item: { id: 56, ...submittedPayload, product } })
    })
  })

  await page.goto('/products/4')
  await page.getByRole('button', { name: 'Add to cellar' }).click()

  const gift = page.getByRole('checkbox', { name: 'Gift' })
  await expect(gift).not.toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Gift from' })).toHaveCount(0)

  await gift.check()
  const giftFrom = page.getByRole('textbox', { name: 'Gift from' })
  await giftFrom.fill('Old value')
  await gift.uncheck()
  await expect(page.getByRole('textbox', { name: 'Gift from' })).toHaveCount(0)

  await gift.check()
  await expect(page.getByRole('textbox', { name: 'Gift from' })).toHaveValue('')
  await page.getByRole('textbox', { name: 'Gift from' }).fill('Taylor')
  await page.getByRole('button', { name: 'Save cellar item' }).click()

  expect(submittedPayload).toMatchObject({
    product_id: 4,
    gift: true,
    gift_from: 'Taylor'
  })
})

test('cellar edit loads gift state and cannot submit stale gift_from after Gift is disabled', async ({ page }) => {
  let submittedPayload = null

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          id: 55,
          product_id: 4,
          quantity: 1,
          mls: 375,
          container: 'Bottle',
          purchase_price: 5,
          retail_price: 7,
          date_received: '2026-07-20',
          sharing_series_id: null,
          series_version_id: null,
          gift: 1,
          gift_from: 'Morgan',
          notes: 'Launch test',
          product
        }]
      })
    })
  })

  await page.route('**/api/nocodebackend/cellar/55', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    submittedPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ item: { id: 55, product_id: 4, ...submittedPayload, product } })
    })
  })

  await page.goto('/cellar')
  await page.getByRole('button', { name: 'Edit Ace' }).click()

  const gift = page.getByRole('checkbox', { name: 'Gift' })
  await expect(gift).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Gift from' })).toHaveValue('Morgan')

  await gift.uncheck()
  await expect(page.getByRole('textbox', { name: 'Gift from' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Save changes' }).click()

  expect(submittedPayload).toMatchObject({
    gift: false,
    gift_from: ''
  })
})
