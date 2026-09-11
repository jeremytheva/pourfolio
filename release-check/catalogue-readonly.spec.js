import { expect, test } from '@playwright/test'
import { requiredEnvironment, responseJson, signIn } from './support.js'

const ownerCredentials = requiredEnvironment([
  'RELEASE_OWNER_EMAIL',
  'RELEASE_OWNER_PASSWORD'
])

const ZERO_RESULT_QUERY = 'pourfolio-release-check-no-match-9f7c2d8a'
const MISSING_PRODUCT_ID = '9007199254740991'

const isCatalogueSearch = (response, query) => {
  if (!response.ok()) return false
  const url = new URL(response.url())
  return (
    url.pathname === '/api/nocodebackend/catalog/products' &&
    url.searchParams.get('page') === '1' &&
    url.searchParams.get('limit') === '24' &&
    url.searchParams.get('q') === query
  )
}

test.describe.configure({ mode: 'serial', retries: 0 })

test('read-only catalogue failures and verified brewery navigation stay truthful', async ({ page }) => {
  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)

  await page.goto('/search')
  const searchInput = page.getByRole('searchbox', { name: 'Search products, producers or styles' })
  const zeroResultResponsePromise = page.waitForResponse((response) => isCatalogueSearch(response, ZERO_RESULT_QUERY))
  await searchInput.fill(ZERO_RESULT_QUERY)
  const zeroResultResponse = await zeroResultResponsePromise
  const zeroResultPayload = await responseJson(zeroResultResponse)
  expect(zeroResultPayload.items).toEqual([])
  expect(zeroResultPayload.total).toBe(0)
  await expect(page.locator('#product-search-status')).toHaveText('0 products found')
  await expect(page.getByRole('heading', { name: 'No matching products' })).toBeVisible()

  await page.goto(`/products/${MISSING_PRODUCT_ID}`)
  const unavailable = page.getByRole('alert')
  await expect(unavailable).toBeFocused()
  await expect(unavailable.getByRole('heading', { name: 'Product unavailable' })).toBeVisible()
  await expect(unavailable.getByRole('link', { name: 'Back to products' })).toBeVisible()
  await expect(unavailable.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Rate this beer' })).toHaveCount(0)

  await page.goto('/places')
  const breweryPanel = page.getByRole('tabpanel', { name: 'Breweries' })
  await expect(breweryPanel).toBeVisible()
  await expect(breweryPanel.getByRole('status')).toHaveText(/^\d+ verified breweries shown\.$/)

  const breweryLinks = breweryPanel.locator('a[href^="/breweries/"]')
  expect(await breweryLinks.count()).toBeGreaterThan(0)
  const breweryPath = await breweryLinks.first().getAttribute('href')
  expect(breweryPath).toMatch(/^\/breweries\/\d+$/)

  await breweryLinks.first().click()
  await expect(page).toHaveURL(new RegExp(`${breweryPath}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/attributed beer/i).first()).toBeVisible()
})
