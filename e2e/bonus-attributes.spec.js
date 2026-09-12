import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

const reachAllBonusAttributes = async (page) => {
  await page.goto('/products/4/rate')
  await expect(page.getByRole('heading', { name: 'Design', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await page.getByRole('button', { name: 'Appearance: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Aroma: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Mouthfeel: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Flavour: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Follow: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await expect(page.getByRole('heading', { name: 'All bonus attributes', level: 2 })).toBeFocused()
}

test('All bonus attributes supports search and explicit category reveal controls', async ({ page }) => {
  await reachAllBonusAttributes(page)

  await page.getByRole('button', { name: 'Show all categories' }).click()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Long finish/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Style wow/ })).toBeVisible()

  await page.getByRole('button', { name: 'Hide all categories' }).click()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toHaveCount(0)

  const search = page.getByRole('searchbox', { name: 'Search bonus attributes' })
  await search.fill('finish')
  await expect(page.getByRole('checkbox', { name: /Long finish/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toHaveCount(0)
})

test('custom Overall bonus attribute is created, selected and contributes immediately', async ({ page }) => {
  let createdBody = null
  await page.route('**/api/nocodebackend/bonus-attributes', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    createdBody = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        bonusAttribute: {
          id: 99,
          description: createdBody.description,
          point_value: createdBody.pointValue,
          effective_point_value: createdBody.pointValue,
          category_keys: ['overall']
        },
        category: { key: 'overall', name: 'Overall' }
      })
    })
  })

  await reachAllBonusAttributes(page)

  await page.getByRole('textbox', { name: 'Description' }).fill('Personal wow factor')
  await page.getByRole('spinbutton', { name: 'Point value' }).fill('0.7')
  await page.getByRole('button', { name: 'Add attribute' }).click()

  expect(createdBody).toEqual({ description: 'Personal wow factor', pointValue: 0.7 })
  await expect(page.getByRole('checkbox', { name: /Personal wow factor/ })).toBeChecked()
  await expect(page.getByText('0.70', { exact: true })).toBeVisible()
  await expect(page.getByText('1 / 2', { exact: true })).toBeVisible()
})
