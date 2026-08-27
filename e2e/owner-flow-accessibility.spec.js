import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('cellar search and edit mutations expose accessible relationships, busy state and focused errors', async ({ page }) => {
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

  const edit = page.getByRole('button', { name: 'Edit Ace' })
  await expect(edit).toHaveAttribute('aria-expanded', 'false')
  await expect(edit).toHaveAttribute('aria-controls', 'cellar-edit-55')
  await edit.click()
  await expect(edit).toHaveAttribute('aria-expanded', 'true')

  const form = page.locator('#cellar-edit-55')
  await page.getByLabel('Quantity').fill('3')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(form).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: 'Saving changes…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Close editor for Ace' })).toBeDisabled()

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

test('profile rating delete disables the active control while the request is pending', async ({ page }) => {
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
})
