import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { product, installMockApi } from './mockApi.js'
import { styleReferencesForCategory } from '../api/_lib/styleGuidelines.js'
import { RATING_DISTRIBUTION_BUCKETS } from '../src/lib/completedRatingContract.js'

const setup = async (page, { category = { id: 31, category_name: 'American IPA' }, abv = 5.5, ibu = 85, failReference = false } = {}) => {
  await installMockApi(page)
  const listed = { ...product, product_category_id: category.id, category, abv, ibu }
  const detail = { ...listed, ratingSummary: { count: 0, average: null }, ratingInsights: { distribution: RATING_DISTRIBUTION_BUCKETS.map((bucket) => ({ ...bucket, count: 0 })), attributes: [] }, ratings: [] }
  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({ json: detail }))
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const pageSize = Number(new URL(route.request().url()).searchParams.get('limit'))
    return route.fulfill({ json: { items: [listed], page: 1, pageSize, total: 1, totalPages: 1 } })
  })
  await page.route('**/api/nocodebackend/catalog/style-references/*', (route) => failReference
    ? route.fulfill({ status: 503, json: { error: 'Unavailable' } })
    : route.fulfill({ json: styleReferencesForCategory(category) }))
}

test('beer comparison shows source/version, exact specifications and changes guide without changing product or rating', async ({ page }, testInfo) => {
  await setup(page)
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  const writes = []
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()) })
  await page.goto('/products/4')
  const panel = page.getByRole('region', { name: 'Style reference comparison' })
  await expect(panel.getByText('5.5–7.5 % ABV', { exact: true })).toBeVisible()
  await expect(panel.getByText('15 IBU above reference range')).toBeVisible()
  await panel.getByLabel('Style guideline').selectOption('ba-2026:american-ipa')
  await expect(panel.getByText('American-Style India Pale Ale', { exact: true })).toBeVisible()
  await expect(panel.getByText('0.8 percentage points below reference range')).toBeVisible()
  await expect(panel.getByText('6.3–7.5 % ABV', { exact: true })).toBeVisible()
  await expect(panel.getByRole('link', { name: /View source guidelines/ })).toHaveAttribute('href', /brewersassociation.org/)
  await expect(page.getByRole('link', { name: 'Rate this beer' })).toBeVisible()
  expect(writes).toEqual([])
  expect((await new AxeBuilder({ page }).include('section[aria-labelledby]').analyze()).violations).toEqual([])
  await panel.screenshot({ path: testInfo.outputPath('style-reference-desktop.png') })
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(panel.getByText('0.8 percentage points below reference range')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await panel.screenshot({ path: testInfo.outputPath('style-reference-mobile.png') })
  expect(runtimeErrors).toEqual([])
})

test('zero is compared and missing specifications remain unknown', async ({ page }) => {
  await setup(page, { abv: null, ibu: 0 })
  await page.goto('/products/4')
  const panel = page.getByRole('region', { name: 'Style reference comparison' })
  await expect(panel.getByText('Exact value not recorded', { exact: true })).toBeVisible()
  await expect(panel.getByText('0 IBU', { exact: true })).toBeVisible()
  await expect(panel.getByText('40 IBU below reference range')).toBeVisible()
})

test('base-style-dependent guidelines expose no invented numeric band', async ({ page }) => {
  await setup(page, { category: { id: 229, category_name: 'Mixed-Fermentation Sour Beer' } })
  await page.goto('/products/4')
  const panel = page.getByRole('region', { name: 'Style reference comparison' })
  await expect(panel.getByText('No fixed reference range', { exact: true })).toHaveCount(2)
  await expect(panel.getByText('Varies by base style', { exact: true })).toHaveCount(2)
  await expect(panel.getByLabel('Style guideline')).toHaveCount(0)
})

test('unmapped styles and reference-service failure do not block the product', async ({ page }) => {
  await setup(page, { category: { id: 248, category_name: 'Pale Ale' } })
  await page.goto('/products/4')
  await expect(page.getByText('A verified guideline mapping is not available')).toBeVisible()
  await setup(page, { failReference: true })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Retry style references' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ace', exact: true })).toBeVisible()
  await page.route('**/api/nocodebackend/catalog/style-references/*', (route) => route.fulfill({ json: styleReferencesForCategory({ id: 31, category_name: 'American IPA' }) }))
  await page.getByRole('button', { name: 'Retry style references' }).click()
  await expect(page.getByText('5.5–7.5 % ABV', { exact: true })).toBeVisible()
})

test('style page reuses the same references without inventing an example beer', async ({ page }) => {
  await setup(page)
  await page.goto('/styles/31')
  const panel = page.getByRole('region', { name: 'Style reference ranges' })
  await expect(panel.getByText('5.5–7.5 % ABV', { exact: true })).toBeVisible()
  await expect(panel.getByText('Recorded specification')).toHaveCount(0)
})
