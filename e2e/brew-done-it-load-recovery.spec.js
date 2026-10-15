import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

const respond = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body)
})

test.beforeEach(async ({ page }) => installMockApi(page))

test('a failed challenge list is not presented as empty and can be retried', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/nocodebackend/brew-done-it/games', (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    attempts += 1
    return attempts === 1
      ? respond(route, { error: 'Service unavailable' }, 503)
      : respond(route, { series: [{ game: { id: 71, status: 'waiting' }, round: null }] })
  })

  await page.goto('/brew-done-it')
  await expect(page.getByRole('alert')).toContainText('Your challenges could not be loaded')
  await expect(page.getByRole('heading', { name: 'Your challenges' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry loading challenges' }).click()
  await expect(page.getByRole('heading', { name: 'Your challenges' })).toBeVisible()
  await expect(page.getByText('Series 71', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(attempts).toBe(2)
})

test('a failed statistics read does not display fabricated zero totals', async ({ page }) => {
  await page.route('**/api/nocodebackend/brew-done-it/games', (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return respond(route, { series: [] })
  })
  let attempts = 0
  await page.route('**/api/nocodebackend/brew-done-it/stats', (route) => {
    attempts += 1
    return attempts === 1
      ? respond(route, { error: 'Service unavailable' }, 503)
      : respond(route, { seriesCount: 3, terminalRounds: 2, awardedPoints: 9 })
  })

  await page.goto('/brew-done-it')
  await expect(page.getByRole('alert')).toContainText('Your statistics could not be loaded')
  await expect(page.getByRole('heading', { name: 'Your Brew Done It record' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry loading statistics' }).click()
  const record = page.getByRole('heading', { name: 'Your Brew Done It record' })
  await expect(record).toBeVisible()
  await expect(page.getByText('Rounds ended')).toBeVisible()
  await expect(page.locator('section[aria-labelledby="statistics-heading"] dd').first()).toHaveText('3')
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(attempts).toBe(2)
})

test('deduction board remains unavailable until failed options load is retried', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/nocodebackend/brew-done-it/games', (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return respond(route, { series: [{ game: { id: 71, status: 'active' }, round: { id: 81, status: 'guessing', guesser_participant_id: 'user-1', selector_participant_id: 'user-2', round_number: 1 } }] })
  })
  await page.route('**/api/nocodebackend/brew-done-it/games/71', (route) => respond(route, {
    game: { id: 71, status: 'active', creator_participant_id: 'user-2', opponent_participant_id: 'user-1' },
    rounds: [{ id: 81, game_id: 71, status: 'guessing', round_number: 1, version: 0, guesser_participant_id: 'user-1', selector_participant_id: 'user-2' }]
  }))
  await page.route('**/api/nocodebackend/brew-done-it/rounds/81/deductions', (route) => respond(route, { deductions: [] }))
  await page.route('**/api/nocodebackend/brew-done-it/options', (route) => {
    attempts += 1
    return attempts === 1
      ? respond(route, { error: 'Options unavailable' }, 503)
      : respond(route, { breweries: [], styles: [], beers: [], capabilities: {} })
  })

  await page.goto('/brew-done-it')
  await expect(page.getByRole('button', { name: 'Open series' })).toBeVisible()
  await page.getByRole('button', { name: 'Open series' }).click()
  await expect(page.getByRole('alert')).toContainText('Deduction options could not be loaded')
  await expect(page.getByRole('heading', { name: 'Deduction board' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry loading options' }).click()
  await expect(page.getByRole('heading', { name: 'Deduction board' })).toBeVisible()
  await expect(page.getByText('Deduction options could not be loaded')).toHaveCount(0)
  expect(attempts).toBe(2)
})
