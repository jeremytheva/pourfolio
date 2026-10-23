import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

const publicProfileId = 'profile_abcdefgh1234'

const publicProfile = {
  profile: {
    public_id: publicProfileId,
    name: 'Beer Friend',
    description: 'Likes dark beer.',
    avatar_url: null
  },
  ratings: [
    {
      id: 14,
      product_id: 4,
      date_rated: '2026-09-10T10:00:00.000Z',
      total_unweighted: 4.2,
      total_weighted: 4.4,
      product: {
        id: 4,
        product_name: 'Ace',
        producer: { id: 8, producer_name: 'Hop House' }
      }
    }
  ],
  summary: { count: 1, average: 4.4 }
}

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('legacy local privacy flags cannot override or publish a server-private profile', async ({ page }) => {
  const legacy = JSON.stringify({ profileVisibleToPublic: true, ratingsVisibleToPublic: true, cellarVisibleToPublic: true })
  await page.addInitScript((value) => localStorage.setItem('privacySettings', value), legacy)
  await page.goto('/profile')

  const sharing = page.getByRole('checkbox', { name: 'Share my rating history' })
  await expect(sharing).not.toBeChecked()
  await page.getByLabel('Display name').fill('Still private')
  const update = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/nocodebackend/profile' && request.method() === 'PUT')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  expect((await update).postDataJSON()).toEqual({
    name: 'Still private', description: '', avatar_url: '', rating_history_public: false
  })
  await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Display name')).toHaveValue('Still private')
  await expect(sharing).not.toBeChecked()
  expect(await page.evaluate(() => localStorage.getItem('privacySettings'))).toBe(legacy)
})

test('public user profile shows only the opted-in rated-beer history projection', async ({ page }) => {
  await page.route(`**/api/nocodebackend/profiles/${publicProfileId}?**`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(publicProfile)
  }))

  await page.goto(`/users/${publicProfileId}`)

  await expect(page.getByRole('heading', { name: 'Beer Friend', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rated beers', level: 2 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ace' })).toHaveAttribute('href', '/products/4')
  await expect(page.getByText('Hop House')).toBeVisible()
  await expect(page.getByLabel('Shared rating history').getByText('4.4 / 5')).toBeVisible()
  await expect(page.getByText('test@example.com')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Delete rating/ })).toHaveCount(0)
})

test('public profile provider failure uses a recoverable focused error state', async ({ page }) => {
  await page.route(`**/api/nocodebackend/profiles/${publicProfileId}?**`, (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({
      error: 'Public user profile is temporarily unavailable.',
      code: 'profile_provider_unavailable'
    })
  }))

  await page.goto(`/users/${publicProfileId}`)

  const alert = page.getByRole('alert')
  await expect(alert).toBeFocused()
  await expect(alert).toContainText('Public user profile is temporarily unavailable.')
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
})
