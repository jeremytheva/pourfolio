import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('brewery profile shows privacy-safe community and personal statistics', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/breweries/20')

  await expect(page.getByRole('heading', { name: 'Rocky Ridge Brewing' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Community profile' })).toBeVisible()
  await expect(page.getByText('4.20 / 5', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('of 1 verified catalogue beers', { exact: true })).toBeVisible()
  await expect(page.getByText('Aroma', { exact: true })).toBeVisible()
  await expect(page.getByText('Design', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Burp', { exact: true })).toHaveCount(0)

  await expect(page.getByRole('heading', { name: 'Your history' })).toBeVisible()
  await expect(page.getByText('4.50 / 5', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your highest rated beers' })).toBeVisible()

  const back = page.getByRole('link', { name: 'Back to Breweries & Venues' })
  await expect(back).toHaveAttribute('href', '/places')
})

test('brewery profile does not render individual community rating details', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/breweries/20')

  await expect(page.getByText('Aggregate completed ratings only. Individual community ratings and private tasting details are not shown.')).toBeVisible()
  await expect(page.getByText('Launch test')).toHaveCount(0)
  await expect(page.getByText('$5')).toHaveCount(0)
})
