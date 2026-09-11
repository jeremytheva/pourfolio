import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('places lists only verified brewery relationships and links to the brewery profile', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/places')

  await expect(page.getByText('1 verified brewery shown.', { exact: true })).toBeVisible()
  const breweryLink = page.getByRole('link', { name: /Rocky Ridge Brewing/ })
  await expect(breweryLink).toContainText('1 attributed beer')
  await breweryLink.click()

  await expect(page).toHaveURL(/\/breweries\/20$/)
  await expect(page.getByRole('heading', { name: 'Rocky Ridge Brewing' })).toBeVisible()
})

test('places brewery search keeps unmatched verified data honest', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/places')

  const search = page.getByRole('searchbox', { name: 'Search verified breweries' })
  await search.fill('not a real relationship')

  await expect(page.getByText('0 verified breweries shown.', { exact: true })).toBeVisible()
  await expect(page.getByText('No verified breweries match this search.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Rocky Ridge Brewing/ })).toHaveCount(0)
})
