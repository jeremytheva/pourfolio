import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test('brewery beer catalogue supports local search, rated-state filters and reset', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/breweries/20')

  const catalogue = page.getByRole('heading', { name: 'Beer from this brewery', level: 2 }).locator('..').locator('..')
  await expect(catalogue.getByRole('heading', { name: 'Ace', level: 3 })).toBeVisible()
  await expect(catalogue.getByText('Community 4.20 / 5 · 3 ratings')).toBeVisible()
  await expect(catalogue.getByText('Your score 4.50 / 5')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search beers' }).fill('missing')
  await expect(catalogue.getByText('No beers match the selected filters.')).toBeVisible()
  await expect(catalogue.getByRole('status')).toHaveText('0 of 1 beer shown')

  await page.getByRole('button', { name: 'Reset filters' }).click()
  await expect(catalogue.getByRole('heading', { name: 'Ace', level: 3 })).toBeVisible()

  await page.getByLabel('Rated state').selectOption('mine-unrated')
  await expect(catalogue.getByText('No beers match the selected filters.')).toBeVisible()
  await page.getByLabel('Rated state').selectOption('mine-rated')
  await expect(catalogue.getByRole('heading', { name: 'Ace', level: 3 })).toBeVisible()
})

test('brewery beer catalogue exposes canonical category and deterministic sort controls', async ({ page }) => {
  await installMockApi(page)
  await page.goto('/breweries/20')

  await expect(page.getByLabel('Category')).toHaveValue('all')
  await expect(page.getByLabel('Category').locator('option')).toHaveText(['All categories', 'Pale Ale'])
  await expect(page.getByLabel('Sort')).toHaveValue('name')
  await page.getByLabel('Sort').selectOption('community-score')
  await expect(page.getByLabel('Sort')).toHaveValue('community-score')
})
