import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('places lists only verified brewery relationships and links to the brewery profile', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/places')

  await expect(page.getByText('1 verified brewery found.', { exact: true })).toBeVisible()
  const breweryLink = page.getByRole('link', { name: /Rocky Ridge Brewing/ })
  await expect(breweryLink).toContainText('1 attributed beer')
  await breweryLink.click()

  await expect(page).toHaveURL(/\/breweries\/20$/)
  await expect(page.getByRole('heading', { name: 'Rocky Ridge Brewing' })).toBeVisible()
})

test('places brewery search is server-backed and keeps unmatched verified data honest', async ({ page }) => {
  await installMockApi(page)
  const producerRequests = []
  page.on('request', (request) => {
    if (request.url().includes('/api/nocodebackend/catalog/producers?')) producerRequests.push(request.url())
  })

  await page.goto('/places')
  const search = page.getByRole('searchbox', { name: 'Search verified breweries' })
  await search.fill('not a real relationship')

  await expect(page.getByText('0 verified breweries found.', { exact: true })).toBeVisible()
  await expect(page.getByText('No verified breweries match this search.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Rocky Ridge Brewing/ })).toHaveCount(0)
  await expect.poll(() => producerRequests.some((url) => new URL(url).searchParams.get('q') === 'not a real relationship')).toBe(true)
})

test('places brewery pagination moves focus to refreshed verified results', async ({ page }) => {
  await installMockApi(page)
  const rows = Array.from({ length: 25 }, (_, index) => ({
    producer: {
      id: index + 1,
      producer_name: `Brewery ${String(index + 1).padStart(2, '0')}`,
      address: '',
      suburb_id: null
    },
    productCount: index + 1
  }))

  await page.route('**/api/nocodebackend/catalog/producers?**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('hasProducts') !== 'true') return route.fallback()
    const requestedPage = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('limit') || 24)
    const items = requestedPage === 1 ? rows.slice(0, 24) : rows.slice(24)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items,
        page: requestedPage,
        pageSize,
        total: 25,
        totalPages: 2
      })
    })
  })

  await page.goto('/places')
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByText('Brewery 25')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Verified brewery results' })).toBeFocused()
  await expect(page.getByText('Page 2 of 2')).toHaveAttribute('aria-current', 'page')
})
