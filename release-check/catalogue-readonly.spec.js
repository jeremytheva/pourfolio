import { expect, test } from '@playwright/test'
import { requiredEnvironment, responseJson, signIn, signOut } from './support.js'
import { validateCatalogueCategoryPage } from '../src/services/catalogueResponse.js'

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
  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD, { reuseSession: true })

  await page.goto('/search')
  const searchInput = page.getByRole('searchbox', { name: 'Search beers, breweries or styles' })
  const zeroResultResponsePromise = page.waitForResponse((response) => isCatalogueSearch(response, ZERO_RESULT_QUERY))
  await searchInput.fill(ZERO_RESULT_QUERY)
  const zeroResultResponse = await zeroResultResponsePromise
  const zeroResultPayload = await responseJson(zeroResultResponse)
  expect(zeroResultPayload.items).toEqual([])
  expect(zeroResultPayload.total).toBe(0)
  await expect(page.locator('#catalogue-search-status')).toHaveText('0 beers, 0 breweries, 0 styles')
  await expect(page.getByRole('heading', { name: 'No matches found' })).toBeVisible()

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
  await expect(breweryPanel.getByRole('status')).toHaveText(/^\d+ verified (?:brewery|breweries) found\.$/)

  const breweryLinks = breweryPanel.locator('a[href^="/breweries/"]')
  expect(await breweryLinks.count()).toBeGreaterThan(0)
  const breweryPath = await breweryLinks.first().getAttribute('href')
  expect(breweryPath).toMatch(/^\/breweries\/\d+$/)

  await breweryLinks.first().click()
  await expect(page).toHaveURL(new RegExp(`${breweryPath}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const breweryProducts = page.getByRole('heading', { name: 'Beer from this brewery' }).locator('xpath=..').locator('xpath=..')
  await expect(breweryProducts.getByRole('link')).not.toHaveCount(0)
})

test('connected Add Beer style choices use every authenticated canonical category page', async ({ page }) => {
  test.setTimeout(120_000)
  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)

  const seen = new Set()
  const categories = []
  let totalPages = 1
  for (let current = 1; current <= totalPages; current += 1) {
    if (current > 25) throw new Error('Connected category pagination exceeded the bounded page count.')
    const response = await page.request.get(`/api/nocodebackend/catalog/categories?page=${current}&limit=100`)
    expect(response.status()).toBe(200)
    const body = await responseJson(response)
    const result = validateCatalogueCategoryPage(body, { expectedPage: current, expectedPageSize: 100 })
    totalPages = result.totalPages
    for (const category of result.items) {
      const id = String(category.id)
      expect(seen.has(id)).toBe(false)
      seen.add(id)
      categories.push(category)
    }
  }
  expect(categories.length).toBeGreaterThan(0)

  await page.goto('/products/propose')
  const style = page.getByRole('combobox', { name: 'Beer style / category' })
  await expect(style).toBeVisible()
  const categoryName = categories[0].category_name
  await style.fill(categoryName)
  await page.getByRole('option').filter({ has: page.getByText(categoryName, { exact: true }) }).first().click()
  await expect(style).toHaveValue(categoryName)
  await signOut(page)
})
