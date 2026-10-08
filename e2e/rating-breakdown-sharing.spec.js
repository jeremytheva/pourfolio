import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

const publicId = 'profile_abcdefgh1234'
const detailsPayload = { breakdown: {
  scores: [{ name: 'Design', score: 7, scale: 7, scored: false },
    { name: 'Appearance', score: 1, scale: 7, scored: true },
    { name: 'Bonus', score: 0, scale: 2, scored: true }, { name: 'Burp', score: 0, scale: 1, scored: false }],
  selected_attributes: [{ description: 'Balanced like a trapeze artist' }], incomplete: false
} }
const ownRating = { id: 99, product_id: 4, date_rated: '2026-10-08', total_unweighted: 4, total_weighted: 4, product }
const ownHistory = (deleted = false) => ({ items: deleted ? [] : [ownRating], page: 1, pageSize: 20,
  total: deleted ? 0 : 1, totalPages: deleted ? 0 : 1, summary: { count: deleted ? 0 : 1, averageWeighted: deleted ? null : 4 } })
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

test.beforeEach(async ({ page }) => { await installMockApi(page) })

test('historical breakdown is collapsed, lazy, keyboard accessible and reuses recorded details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let reads = 0
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => reply(route, ownHistory()))
  await page.route('**/api/nocodebackend/ratings/99/breakdown', (route) => { reads += 1; return reply(route, detailsPayload) })
  await page.goto('/profile?rating=99')
  const row = page.locator('#rating-99')
  await expect(row).toBeFocused()
  const dropdown = row.locator('details')
  await expect(dropdown).not.toHaveAttribute('open')
  expect(reads).toBe(0)
  await dropdown.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(dropdown.getByLabel('Recorded attribute scores')).toContainText(/Appearance\s*1 \/ 7/)
  await expect(dropdown).toContainText(/Bonus\s*0 \/ 2/)
  await expect(dropdown).toContainText(/Burp\s*\(non-scoring extra\)\s*0 \/ 1/)
  await expect(dropdown.getByLabel('Recorded tasting attributes')).toContainText('Balanced like a trapeze artist')
  await expect(dropdown).toContainText(/Stored weighted score\s*4 \/ 5/)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
  await dropdown.locator('summary').click()
  await dropdown.locator('summary').click()
  await expect(dropdown.getByLabel('Recorded attribute scores')).toBeVisible()
  expect(reads).toBe(1)
})

test('breakdown errors can be retried without losing the verified history entry', async ({ page }) => {
  let reads = 0
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => reply(route, ownHistory()))
  await page.route('**/api/nocodebackend/ratings/99/breakdown', (route) => {
    reads += 1
    return reads === 1 ? reply(route, { error: 'Recorded details unavailable.' }, 503) : reply(route, detailsPayload)
  })
  await page.goto('/profile')
  const row = page.locator('#rating-99')
  await row.locator('summary').click()
  await expect(row.getByRole('alert')).toBeFocused()
  await expect(row).toContainText('4 / 5')
  await row.getByRole('button', { name: 'Retry rating details' }).click()
  await expect(row.getByLabel('Recorded attribute scores')).toBeVisible()
  expect(reads).toBe(2)
})

test('other-user beer tasting opens that exact public entry on an older page and survives reload', async ({ page }) => {
  const sharedRating = { id: 1, product_id: 4, date_rated: '2025-06-18', total_weighted: 3,
    author: { public_id: publicId, name: 'Beer Friend' } }
  const profilePayload = { profile: { public_id: publicId, name: 'Beer Friend', description: '', avatar_url: null },
    ratings: [{ id: 1, product_id: 4, date_rated: '2025-06-18', total_weighted: 3,
      product: { id: product.id, product_name: product.product_name, producer: product.producer } }],
    summary: { count: 21, average: 4 }, page: 2, pageSize: 20, totalPages: 2 }
  const selections = []
  let publicReads = 0
  let privateReads = 0
  page.on('request', (request) => { if (/\/ratings\/\d+\/breakdown/.test(new URL(request.url()).pathname) && !request.url().includes('/profiles/')) privateReads += 1 })
  await page.route('**/api/nocodebackend/ratings/shared?**', (route) => reply(route, {
    items: [sharedRating], page: 1, pageSize: 20, total: 1, totalPages: 1
  }))
  await page.route(`**/api/nocodebackend/profiles/${publicId}?**`, (route) => {
    selections.push(new URL(route.request().url()).searchParams.get('rating_id'))
    return reply(route, profilePayload)
  })
  await page.route(`**/api/nocodebackend/profiles/${publicId}/ratings/1/breakdown`, (route) => { publicReads += 1; return reply(route, detailsPayload) })
  await page.goto('/products/4')
  await expect(page.getByRole('region', { name: 'Your tasting history' }).getByRole('link').first()).toHaveAttribute('href', '/profile?rating=99')
  const history = page.getByRole('region', { name: 'Shared tasting history' })
  const link = history.getByRole('link', { name: "View Beer Friend's rating from 18 June 2025 in profile" })
  await expect(link).toHaveAttribute('href', `/users/${publicId}?rating=1`)
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/users/${publicId}\\?rating=1$`))
  await expect(page.locator('#rating-1')).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Shared rating history pages' })).toContainText('Page 2 of 2')
  await expect(page.getByRole('button', { name: /Delete rating/ })).toHaveCount(0)
  await page.locator('#rating-1 summary').click()
  await expect(page.getByLabel('Recorded attribute scores')).toBeVisible()
  expect(publicReads).toBe(1)
  expect(privateReads).toBe(0)
  await page.reload()
  await expect(page.locator('#rating-1')).toBeFocused()
  expect(selections).toEqual(['1', '1'])
})

test('revoked public sharing does not redirect a rating into the viewer profile', async ({ page }) => {
  await page.route(`**/api/nocodebackend/profiles/${publicId}?**`, (route) => reply(route, {
    code: 'rating_not_found', error: 'That shared rating is unavailable.'
  }, 404))
  await page.goto(`/users/${publicId}?rating=1`)
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page.getByRole('alert')).toContainText('That shared rating is unavailable.')
  await expect(page).toHaveURL(new RegExp(`/users/${publicId}\\?rating=1$`))
  await expect(page.getByLabel('Shared rating history')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'View all shared ratings' })).toHaveAttribute('href', `/users/${publicId}`)
})

test('failed deletion retains the entry, retries and refreshes the authoritative history', async ({ page }) => {
  let deleted = false
  let attempts = 0
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => reply(route, ownHistory(deleted)))
  await page.route('**/api/nocodebackend/ratings/99', (route) => {
    expect(route.request().method()).toBe('DELETE')
    attempts += 1
    if (attempts === 1) return reply(route, { error: 'Rating deletion could not be confirmed yet. Please retry.' }, 503)
    deleted = true
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/profile?rating=99')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete rating for Ace' }).click()
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page.locator('#rating-99')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete rating for Ace' }).click()
  await expect(page.locator('#rating-99')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'My ratings' })).toBeFocused()
  expect(attempts).toBe(2)
  await page.reload()
  await expect(page.locator('#rating-99')).toHaveCount(0)
})
