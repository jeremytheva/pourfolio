import { expect, test } from '@playwright/test'
import { installMockApi, product } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('cellar search and edit mutations expose accessible relationships, focus, busy state and focused errors', async ({ page }) => {
  let releaseSave
  const saveGate = new Promise((resolve) => { releaseSave = resolve })

  await page.route('**/api/nocodebackend/cellar/55', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    await saveGate
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Cellar save unavailable.' })
    })
  })

  await page.goto('/cellar')

  const search = page.getByRole('searchbox', { name: 'Search cellar' })
  await expect(search).toHaveAttribute('aria-describedby', 'cellar-search-status')
  await search.fill('Ace')
  await expect(page.locator('#cellar-search-status')).toContainText('1 item shown for this search.')

  const edit = page.locator('button[aria-controls="cellar-edit-55"]')
  await expect(edit).toHaveAccessibleName('Edit Ace')
  await expect(edit).toHaveAttribute('aria-expanded', 'false')
  await edit.click()
  await expect(edit).toHaveAccessibleName('Close editor for Ace')
  await expect(edit).toHaveAttribute('aria-expanded', 'true')

  const form = page.locator('#cellar-edit-55')
  const quantity = page.getByLabel('Quantity')
  await expect(quantity).toBeFocused()
  await quantity.fill('3')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(form).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: 'Saving changes…' })).toBeDisabled()
  await expect(edit).toBeDisabled()

  releaseSave()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Cellar save unavailable.')
  await expect(alert).toBeFocused()
  await expect(form).toHaveAttribute('aria-busy', 'false')
})

test('profile save exposes busy state and focuses failed mutation feedback', async ({ page }) => {
  let releaseSave
  const saveGate = new Promise((resolve) => { releaseSave = resolve })

  await page.route('**/api/nocodebackend/profile', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    await saveGate
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Profile save unavailable.' })
    })
  })

  await page.goto('/profile')
  await page.getByLabel('Display name').fill('Jeremy Updated')
  await page.getByRole('button', { name: 'Save profile' }).click()

  const profileForm = page.locator('section[aria-labelledby="profile-details"] form')
  const savingButton = page.getByRole('button', { name: 'Saving…' })
  await expect(profileForm).toHaveAttribute('aria-busy', 'true')
  await expect(savingButton).toHaveAttribute('aria-busy', 'true')
  await expect(savingButton).toBeDisabled()

  releaseSave()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Profile save unavailable.')
  await expect(alert).toBeFocused()
  await expect(profileForm).toHaveAttribute('aria-busy', 'false')
})

test('profile rating history load failure has a focused retry path that recovers', async ({ page }) => {
  let attempt = 0

  await page.route('**/api/nocodebackend/ratings/mine', async (route) => {
    attempt += 1
    if (attempt === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rating history unavailable.' })
      })
    }
    return route.fallback()
  })

  await page.goto('/profile')

  const ratingSection = page.locator('section[aria-labelledby="rating-history"]')
  const alert = ratingSection.getByRole('alert')
  await expect(alert).toContainText('Rating history unavailable.')
  await expect(alert).toBeFocused()

  const retry = ratingSection.getByRole('button', { name: 'Retry rating history' })
  await retry.click()
  await expect(ratingSection).toHaveAttribute('aria-busy', 'true')
  await expect(ratingSection.getByRole('link', { name: 'Ace' })).toBeVisible()
  await expect(alert).toHaveCount(0)
})

test('profile rating delete disables the active control and restores focus to the heading when the list becomes empty', async ({ page }) => {
  let releaseDelete
  const deleteGate = new Promise((resolve) => { releaseDelete = resolve })

  await page.route('**/api/nocodebackend/ratings/99', async (route) => {
    await deleteGate
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/profile')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete rating for Ace' }).click()

  const deletingButton = page.getByRole('button', { name: 'Deleting rating for Ace' })
  await expect(deletingButton).toBeDisabled()
  await expect(deletingButton.locator('xpath=ancestor::li')).toHaveAttribute('aria-busy', 'true')

  releaseDelete()
  await expect(page.getByRole('button', { name: /rating for Ace/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'My ratings' })).toBeFocused()
})

test('profile rating delete restores focus to an adjacent remaining rating', async ({ page }) => {
  const secondProduct = { ...product, id: 5, product_name: 'Bravo' }
  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [
        {
          id: 99,
          rating_id: 1700000000000001,
          product_id: 4,
          cellar_id: null,
          date_rated: '2026-07-27T00:00:00.000Z',
          total_unweighted: 4,
          total_weighted: 4,
          product
        },
        {
          id: 100,
          rating_id: 1700000000000002,
          product_id: 5,
          cellar_id: null,
          date_rated: '2026-07-28T00:00:00.000Z',
          total_unweighted: 5,
          total_weighted: 5,
          product: secondProduct
        }
      ]
    })
  }))
  await page.route('**/api/nocodebackend/ratings/99', (route) => route.fulfill({ status: 204, body: '' }))

  await page.goto('/profile')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete rating for Ace' }).click()

  await expect(page.getByRole('link', { name: 'Bravo' })).toBeFocused()
})
