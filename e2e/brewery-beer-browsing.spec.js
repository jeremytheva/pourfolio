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

test('brewery catalogue safely displays verified unrated beers and keeps rated filters accurate', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/catalog/producers/20', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      producer: { id: 20, producer_name: 'Rocky Ridge Brewing', address: '', suburb_id: 9567 },
      products: [
        { id: 4, product_name: 'Ace', producer_id: 20, product_category_id: 10,
          producer: { id: 20, producer_name: 'Rocky Ridge Brewing' },
          category: { id: 10, category_name: 'Pale Ale' }, declared_category: 'Pale Ale', abv: 5.2 },
        { id: 5, product_name: 'Unrated Reserve', producer_id: 20, product_category_id: 10,
          producer: { id: 20, producer_name: 'Rocky Ridge Brewing' },
          category: { id: 10, category_name: 'Pale Ale' }, declared_category: 'Pale Ale', abv: null }
      ],
      communityStats: {
        catalogueBeerCount: 2, ratingCount: 3, ratedBeerCount: 1, averageWeighted: 4.2,
        averageUnweighted: 4.1, unweightedRatingCount: 2, attributes: [],
        topBeers: [{ productId: 4, productName: 'Ace', averageWeighted: 4.2, ratingCount: 3 }]
      },
      personalStats: {
        ratingCount: 1, ratedBeerCount: 1, averageWeighted: 4.5,
        averageUnweighted: 4.4, unweightedRatingCount: 1,
        topBeers: [{ productId: 4, productName: 'Ace', averageWeighted: 4.5, ratingCount: 1 }]
      },
      productStats: [
        { productId: 4, community: { ratingCount: 3, averageWeighted: 4.2 },
          personal: { ratingCount: 1, averageWeighted: 4.5 } },
        { productId: 5, community: { ratingCount: 0, averageWeighted: null },
          personal: { ratingCount: 0, averageWeighted: null } }
      ]
    })
  }))

  await page.goto('/breweries/20')
  const unratedCard = page.getByRole('link', { name: /Unrated Reserve/ })
  await expect(unratedCard).toBeVisible()
  await expect(unratedCard.getByText('No community score')).toBeVisible()
  await expect(unratedCard.getByText(/Your score/)).toHaveCount(0)

  await page.getByLabel('Rated state').selectOption('mine-unrated')
  await expect(unratedCard).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ace', level: 3 })).toHaveCount(0)

  await page.getByLabel('Rated state').selectOption('community-rated')
  await expect(page.getByRole('heading', { name: 'Ace', level: 3 })).toBeVisible()
  await expect(unratedCard).toHaveCount(0)
  await page.getByLabel('Rated state').selectOption('all')
  await page.getByLabel('Sort').selectOption('community-score')
  await expect(page.getByRole('heading', { name: 'Ace', level: 3 })).toBeVisible()
  await expect(unratedCard).toBeVisible()
})

test('malformed brewery product statistics fail at the verified API boundary, not in rendering', async ({ page }) => {
  await installMockApi(page)
  await page.route('**/api/nocodebackend/catalog/producers/20', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      producer: { id: 20, producer_name: 'Rocky Ridge Brewing', address: '', suburb_id: 9567 },
      products: [{ id: 4, product_name: 'Ace', producer_id: 20, product_category_id: 10,
        producer: { id: 20, producer_name: 'Rocky Ridge Brewing' },
        category: { id: 10, category_name: 'Pale Ale' } }],
      communityStats: { catalogueBeerCount: 1, ratingCount: 0, ratedBeerCount: 0,
        averageWeighted: null, averageUnweighted: null, unweightedRatingCount: 0,
        attributes: [], topBeers: [] },
      personalStats: { ratingCount: 0, ratedBeerCount: 0, averageWeighted: null,
        averageUnweighted: null, unweightedRatingCount: 0, topBeers: [] },
      productStats: []
    })
  }))
  await page.goto('/breweries/20')
  await expect(page.getByRole('heading', { name: 'Brewery unavailable' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Beer from this brewery' })).toHaveCount(0)
})
