import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('brewery rankings show qualified aggregate product-rating results and boundaries', async ({ page }) => {
  await installMockApi(page)
  await page.route(/\/api\/nocodebackend\/catalog\/producers\/rankings(?:\?|$)/u, (route) => {
    const requestUrl = new URL(route.request().url())
    const pageSize = Number(requestUrl.searchParams.get('limit') || 24)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          producer: { id: 20, producer_name: 'Rocky Ridge Brewing', address: '', suburb_id: 9567 },
          averageWeighted: 4.2,
          ratingCount: 5,
          ratedBeerCount: 2,
          catalogueBeerCount: 3
        }],
        page: 1,
        pageSize,
        total: 1,
        totalPages: 1,
        minimumRatings: 3,
        minimumRatedBeers: 2
      })
    })
  })
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
