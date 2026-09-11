import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('places lists only verified brewery relationships and links to the brewery profile', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/places')

  await expect(page.getByRole('status')).toContainText('1 verified brewery shown.')
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

  await expect(page.getByRole('status')).toContainText('0 verified breweries shown.')
  await expect(page.getByText('No verified breweries match this search.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Rocky Ridge Brewing/ })).toHaveCount(0)
})
