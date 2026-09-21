import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('brewery rankings show qualified aggregate product-rating results and boundaries', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/places')

  await page.getByRole('button', { name: 'Rankings' }).click()
  await expect(page.getByRole('heading', { name: 'Brewery rankings' })).toBeVisible()
  await expect(page.getByText('Qualification: at least 3 completed ratings across at least 2 distinct rated beers.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Rocky Ridge Brewing/ })).toContainText('4.20 / 5')
  await expect(page.getByRole('link', { name: /Rocky Ridge Brewing/ })).toContainText('5 ratings')
  await expect(page.getByText(/does not rate brewery service, staff, venue experience or business quality/i)).toBeVisible()
  await expect(page.getByText(/geography requires verified producer geography/i)).toBeVisible()

  await page.getByRole('button', { name: 'Directory' }).click()
  await expect(page.getByLabel('Search verified breweries')).toBeVisible()
})
