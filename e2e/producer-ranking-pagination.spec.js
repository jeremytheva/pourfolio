import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

const rankingItems = () => Array.from({ length: 25 }, (_, index) => ({
  producer: { id: index + 1, producer_name: `Ranked Brewery ${index + 1}`, address: '', suburb_id: null },
  averageWeighted: 4.5,
  ratingCount: 5,
  ratedBeerCount: 2,
  catalogueBeerCount: 3
}))

test('brewery ranking pagination preserves global rank and keyboard focus', async ({ page }) => {
  await installMockApi(page)
  const requests = []
  const ranked = rankingItems()
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
  await expect(page.getByLabel('Rank 25')).toBeVisible()
  await expect(page.getByText('Ranked Brewery 1', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Showing 25–25 of 25 ranked breweries.' })).toBeVisible()
  await expect(pagination.getByRole('button', { name: 'Next' })).toBeDisabled()
  await pagination.getByRole('button', { name: 'Previous' }).click()
  await expect(pagination.getByText('Page 1 of 2')).toBeVisible()
  await expect.poll(() => requests).toEqual([1, 2, 1])
})

test('a ranking page that disappears recovers to the first page without a reload', async ({ page }) => {
  await installMockApi(page)
  const ranked = rankingItems()
  const requests = []
  let reduced = false
  await page.route('**/api/nocodebackend/catalog/producers/rankings?**', (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page'))
    requests.push(requestedPage)
    if (requestedPage === 2) {
      reduced = true
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Producer page is out of range.' }) })
    }
    const total = reduced ? 24 : 25
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: ranked.slice(0, 24), page: 1, pageSize: 24, total, totalPages: reduced ? 1 : 2, minimumRatings: 3, minimumRatedBeers: 2 })
    })
  })
  await page.goto('/places')
  await page.getByRole('button', { name: 'Rankings' }).click()
  const pagination = page.getByRole('navigation', { name: 'Brewery ranking pages' })
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect.poll(() => requests).toEqual([1, 2, 1])
  await expect(page.getByText('Showing 1–24 of 24 ranked breweries.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brewery rankings' })).toBeFocused()
  await expect(page.getByText('Ranked Brewery 1', { exact: true })).toBeVisible()
  await expect(pagination).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('a transient ranking failure retries the requested page and restores accessible focus', async ({ page }) => {
  await installMockApi(page)
  const ranked = rankingItems()
  const requests = []
  let pageTwoAttempts = 0
  await page.route('**/api/nocodebackend/catalog/producers/rankings?**', (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page'))
    requests.push(requestedPage)
    if (requestedPage === 2 && ++pageTwoAttempts === 1) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Temporarily unavailable.' }) })
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: ranked.slice((requestedPage - 1) * 24, requestedPage * 24), page: requestedPage, pageSize: 24, total: 25, totalPages: 2, minimumRatings: 3, minimumRatedBeers: 2 })
    })
  })
  await page.goto('/places')
  await page.getByRole('button', { name: 'Rankings' }).click()
  const pagination = page.getByRole('navigation', { name: 'Brewery ranking pages' })
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('alert')).toBeFocused()
  await expect.poll(() => requests).toEqual([1, 2])
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(pagination.getByText('Page 2 of 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brewery rankings' })).toBeFocused()
  await expect.poll(() => requests).toEqual([1, 2, 2])
})
