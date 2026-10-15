import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('brewery ranking pagination preserves global rank and keyboard focus', async ({ page }) => {
  await installMockApi(page)
  const requests = []
  const ranked = Array.from({ length: 25 }, (_, index) => ({
    producer: { id: index + 1, producer_name: `Ranked Brewery ${index + 1}`, address: '', suburb_id: null },
    averageWeighted: 4.5,
    ratingCount: 5,
    ratedBeerCount: 2,
    catalogueBeerCount: 3
  }))
  await page.route('**/api/nocodebackend/catalog/producers/rankings?**', (route) => {
    const url = new URL(route.request().url())
    const requestedPage = Number(url.searchParams.get('page'))
    const pageSize = Number(url.searchParams.get('limit'))
    requests.push(requestedPage)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: ranked.slice((requestedPage - 1) * pageSize, requestedPage * pageSize),
        page: requestedPage, pageSize, total: ranked.length, totalPages: 2,
        minimumRatings: 3, minimumRatedBeers: 2
      })
    })
  })

  await page.goto('/places')
  await page.getByRole('button', { name: 'Rankings' }).click()
  const pagination = page.getByRole('navigation', { name: 'Brewery ranking pages' })
  await expect(pagination.getByText('Page 1 of 2')).toBeVisible()
  await expect(pagination.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(pagination.getByText('Page 2 of 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brewery rankings' })).toBeFocused()
  await expect(page.getByRole('link', { name: /Ranked Brewery 25/ })).toContainText('25')
  await expect(page.getByRole('link', { name: /Ranked Brewery 1$/ })).toHaveCount(0)
  await expect(pagination.getByRole('button', { name: 'Next' })).toBeDisabled()
  await pagination.getByRole('button', { name: 'Previous' }).click()
  await expect(pagination.getByText('Page 1 of 2')).toBeVisible()
  await expect.poll(() => requests).toEqual([1, 2, 1])
})
