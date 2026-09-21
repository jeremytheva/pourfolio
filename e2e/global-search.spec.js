import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const installGlobalSearchMockApi = async (page, { failBeerSearch = false } = {}) => {
  await installMockApi(page)

  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const requestUrl = new URL(route.request().url())
    const query = requestUrl.searchParams.get('q')?.trim().toLocaleLowerCase() || ''
    const pageSize = Number(requestUrl.searchParams.get('limit') || 24)

    if (query) {
      if (failBeerSearch) {
        return route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Search failed.' })
        })
      }

      const matchesBeer = product.product_name.toLocaleLowerCase().includes(query)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: matchesBeer ? [product] : [],
          page: 1,
          pageSize,
          total: matchesBeer ? 1 : 0,
          totalPages: matchesBeer ? 1 : 0
        })
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [product], page: 1, pageSize, total: 1, totalPages: 1 })
    })
  })
}

test('global search links a brewery match directly to the verified brewery route', async ({ page }) => {
  await installGlobalSearchMockApi(page)
  await page.goto('/search')

  const search = page.getByRole('searchbox', { name: 'Search beers, breweries or styles' })
  await search.fill('Rocky Ridge')

  await expect(page.getByRole('heading', { name: 'Breweries' })).toBeVisible()
  const breweryLink = page.getByRole('link', { name: /Rocky Ridge Brewing/ })
  await expect(breweryLink).toHaveAttribute('href', '/breweries/20')
  await expect(page.getByText('0 beers, 1 brewery, 0 styles', { exact: true })).toBeVisible()
})

test('global search links a style match directly to the verified style route', async ({ page }) => {
  await installGlobalSearchMockApi(page)
  await page.goto('/search')

  const search = page.getByRole('searchbox', { name: 'Search beers, breweries or styles' })
  await search.fill('Pale Ale')

  await expect(page.getByRole('heading', { name: 'Styles' })).toBeVisible()
  const styleLink = page.getByRole('link', { name: /Pale Ale/ })
  await expect(styleLink).toHaveAttribute('href', '/styles/10')
  await expect(page.getByText('0 beers, 0 breweries, 1 style', { exact: true })).toBeVisible()
})

test('global search preserves validated beer results', async ({ page }) => {
  await installGlobalSearchMockApi(page)
  await page.goto('/search')

  const search = page.getByRole('searchbox', { name: 'Search beers, breweries or styles' })
  await search.fill('Ace')

  await expect(page.getByRole('heading', { name: 'Beers' })).toBeVisible()
  await expect(page.locator('a[href="/products/4"]')).toBeVisible()
  await expect(page.getByText('1 beer, 0 breweries, 0 styles', { exact: true })).toBeVisible()
})

test('global search keeps verified brewery results available when beer search fails', async ({ page }) => {
  await installGlobalSearchMockApi(page, { failBeerSearch: true })
  await page.goto('/search')

  const search = page.getByRole('searchbox', { name: 'Search beers, breweries or styles' })
  await search.fill('Rocky Ridge')

  await expect(page.getByText('Beer results are temporarily unavailable.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Rocky Ridge Brewing/ })).toHaveAttribute('href', '/breweries/20')
  await expect(page.getByText('Beer results unavailable, 1 brewery, 0 styles', { exact: true })).toBeVisible()
})

test('global search offers a missing-beer proposal only after all result types return no matches', async ({ page }) => {
  await installGlobalSearchMockApi(page)
  await page.goto('/search')

  const search = page.getByRole('searchbox', { name: 'Search beers, breweries or styles' })
  await search.fill('Unknown Thing')

  await expect(page.getByRole('heading', { name: 'No matches found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Propose this missing beer' })).toHaveAttribute(
    'href',
    '/products/propose?name=Unknown%20Thing'
  )
})
