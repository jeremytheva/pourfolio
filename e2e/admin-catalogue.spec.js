import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installMockApi, product } from './mockApi.js'

const grant = async (page, subjectId = 'user-1') => page.route('**/api/nocodebackend/profile/capabilities', (route) => route.fulfill({ json: { version: 1, subjectId, capabilities: ['catalogue.review'], mode: 'read_only', moderationAvailable: false } }))

test('Admin catalogue supports search, both record types, zero values, responsive keyboard use and no moderation writes', async ({ page }, testInfo) => {
  await installMockApi(page); await grant(page)
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({ json: { items: [{ ...product, abv: 0, ibu: 0 }], page: 1, pageSize: 24, total: 1, totalPages: 1 } }))
  const writes = []
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()) })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Catalogue review' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible()
  await expect(page.getByText('ABV: 0% · IBU: 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Submission approvals are not available yet.', { exact: false })).toBeVisible()
  await page.getByLabel('Search products', { exact: true }).fill('Ace')
  await page.getByRole('button', { name: 'Search catalogue' }).click()
  await expect(page).toHaveURL(/q=Ace/)
  await page.getByRole('link', { name: 'Review details for Ace' }).click()
  await expect(page).toHaveURL(/\/products\/4$/)
  await page.goBack()
  await expect(page.getByLabel('Search products', { exact: true })).toHaveValue('Ace')
  await page.getByRole('button', { name: 'Producers', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Rocky Ridge Brewing', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Review details for Rocky Ridge Brewing' })).toHaveAttribute('href', '/breweries/20')
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('admin-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Products', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ace', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('admin-mobile.png'), fullPage: true })
  expect(writes).toEqual([])
})

test('missing catalogue fields are distinct from unavailable relationship details', async ({ page }) => {
  await installMockApi(page); await grant(page)
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({ json: {
    items: [{ ...product, abv: null, ibu: 0, producer: null, product_category_id: null, category: null }],
    page: 1, pageSize: 24, total: 1, totalPages: 1
  } }))
  await page.goto('/admin')
  await expect(page.getByText('Producer details unavailable · Style not recorded', { exact: true })).toBeVisible()
  await expect(page.getByText('ABV: Not recorded · IBU: 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Missing information: ABV, Style', { exact: true })).toBeVisible()
})

test('ordinary users and forged browser roles get no Admin entry or catalogue workspace data', async ({ page }) => {
  await installMockApi(page)
  await page.addInitScript(() => { localStorage.setItem('role', 'Admin'); localStorage.setItem('isAdmin', 'true') })
  const reads = []
  page.on('request', (request) => { if (request.url().includes('/catalog/')) reads.push(request.url()) })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Admin access required' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0)
  expect(reads).toEqual([])
})

test('wrong-subject capability responses fail closed and recover only after a verified retry', async ({ page }) => {
  await installMockApi(page); await grant(page, 'another-user')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Admin access unavailable' })).toBeVisible()
  await grant(page)
  await page.getByRole('button', { name: 'Retry Admin access' }).click()
  await expect(page.getByRole('heading', { name: 'Catalogue review' })).toBeVisible()
})

test('catalogue failures, empty results and pagination keep explicit states', async ({ page }) => {
  await installMockApi(page); await grant(page)
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await page.goto('/admin')
  await expect(page.getByText('Catalogue records could not be loaded.', { exact: true })).toBeVisible()
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const url = new URL(route.request().url()), pageNumber = Number(url.searchParams.get('page'))
    const empty = url.searchParams.get('q') === 'none'
    const items = empty ? [] : Array.from({ length: pageNumber === 1 ? 24 : 1 }, (_, index) => ({ ...product, id: pageNumber === 1 ? index + 1 : 25, product_name: `Beer ${pageNumber === 1 ? index + 1 : 25}` }))
    return route.fulfill({ json: { items, page: pageNumber, pageSize: 24, total: empty ? 0 : 25, totalPages: empty ? 0 : 2 } })
  })
  await page.getByRole('button', { name: 'Retry catalogue' }).click()
  await expect(page.getByText('Showing 24 products · Page 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Showing 1 product · Page 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByLabel('Search products', { exact: true }).fill('none')
  await page.getByRole('button', { name: 'Search catalogue' }).click()
  await expect(page.getByText('No products match this search.', { exact: true })).toBeVisible()
})

test('a late capability response after logout cannot restore an Admin entry', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/auth/sign-out', (route) => route.fulfill({ json: {} }))
  let release
  let observed
  const pending = new Promise((resolve) => { release = resolve })
  const started = new Promise((resolve) => { observed = resolve })
  await page.route('**/api/nocodebackend/profile/capabilities', async (route) => {
    observed()
    await pending
    await route.fulfill({ json: { version: 1, subjectId: 'user-1', capabilities: ['catalogue.review'], mode: 'read_only', moderationAvailable: false } }).catch(() => {})
  })
  await page.goto('/home')
  await started
  const response = page.waitForResponse('**/api/nocodebackend/profile/capabilities')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  release()
  await response
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0)
})
