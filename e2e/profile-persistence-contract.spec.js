import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

const initialProfile = Object.freeze({
  public_id: 'profile_user_1',
  name: 'Jeremy',
  description: 'Initial profile',
  avatar_url: null,
  rating_history_public: false
})

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
  await page.unroute('**/api/nocodebackend/profile')
})

test('persistent profile form submits only the deployed editable fields and preserves server identity', async ({ page }) => {
  let profile = { ...initialProfile }
  const updateBodies = []

  await page.route('**/api/nocodebackend/profile', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      updateBodies.push(body)
      profile = { ...profile, ...body }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile })
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profile })
    })
  })

  await page.goto('/profile')

  const profileSection = page.locator('section[aria-labelledby="profile-details"]')
  await expect(profileSection.getByLabel('Display name')).toHaveValue('Jeremy')
  await expect(profileSection.getByLabel('About')).toHaveValue('Initial profile')
  await expect(profileSection.getByLabel('Avatar URL')).toHaveValue('')
  await expect(profileSection.getByLabel('Share my rating history')).not.toBeChecked()
  await expect(profileSection.getByRole('link', { name: 'View my public profile' })).toHaveAttribute('href', '/users/profile_user_1')

  await profileSection.getByLabel('Display name').fill('Jeremy Updated')
  await profileSection.getByLabel('About').fill('Updated profile text')
  await profileSection.getByLabel('Avatar URL').fill('https://example.com/avatar.png')
  await profileSection.getByLabel('Share my rating history').check()
  await profileSection.getByRole('button', { name: 'Save profile' }).click()

  await expect(profileSection.getByText('Profile saved.')).toBeVisible()
  await expect(profileSection.getByLabel('Display name')).toHaveValue('Jeremy Updated')
  await expect(profileSection.getByLabel('About')).toHaveValue('Updated profile text')
  await expect(profileSection.getByLabel('Avatar URL')).toHaveValue('https://example.com/avatar.png')
  await expect(profileSection.getByLabel('Share my rating history')).toBeChecked()
  await expect(profileSection.getByRole('link', { name: 'View my public profile' })).toHaveAttribute('href', '/users/profile_user_1')

  expect(updateBodies).toEqual([{
    name: 'Jeremy Updated',
    description: 'Updated profile text',
    avatar_url: 'https://example.com/avatar.png',
    rating_history_public: true
  }])
  expect(updateBodies[0]).not.toHaveProperty('user_id')
  expect(updateBodies[0]).not.toHaveProperty('public_id')
  expect(updateBodies[0]).not.toHaveProperty('id')
})
