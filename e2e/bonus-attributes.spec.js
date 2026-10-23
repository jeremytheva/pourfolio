import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

const reachAllBonusAttributes = async (page) => {
  await page.goto('/products/4/rate')
  await expect(page.getByRole('heading', { name: 'Design', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await page.getByRole('button', { name: 'Appearance: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Aroma: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Mouthfeel: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Flavour: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Follow: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await expect(page.getByRole('heading', { name: 'All bonus attributes', level: 2 })).toBeFocused()
}

test('rating-card bonus attributes are directly visible and support scoped keyword search', async ({ page }) => {
  await page.goto('/products/4/rate')
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await page.getByRole('button', { name: 'Appearance: 4 out of 7' }).click()

  await expect(page.getByRole('heading', { name: 'Aroma', level: 2 })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Resin layers/ })).toBeVisible()

  const search = page.getByRole('searchbox', { name: 'Search Aroma bonus attributes' })
  await search.fill('RESIN!!!')
  await expect(page.getByRole('checkbox', { name: /Resin layers/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toHaveCount(0)

  await search.fill('finish')
  await expect(page.getByText('No aroma bonus attributes match this search.')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Long finish/ })).toHaveCount(0)
})

test('multi-category bonus selection persists across rating tabs and contributes once', async ({ page }) => {
  await page.goto('/products/4/rate')
  await page.getByRole('button', { name: 'Skip this attribute' }).click()
  await page.getByRole('button', { name: 'Appearance: 4 out of 7' }).click()

  const resinOnAroma = page.getByRole('checkbox', { name: /Resin layers/ })
  await resinOnAroma.check()
  await page.getByRole('button', { name: 'Aroma: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Mouthfeel: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Flavour: 4 out of 7' }).click()

  await expect(page.getByRole('heading', { name: 'Follow', level: 2 })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Resin layers/ })).toBeChecked()
  await page.getByRole('button', { name: 'Follow: 4 out of 7' }).click()
  await page.getByRole('button', { name: 'Skip this attribute' }).click()

  await expect(page.getByText('0.40', { exact: true })).toBeVisible()
})

test('All bonus attributes keeps Overall visible and other categories collapsed until opened or searched', async ({ page }) => {
  await reachAllBonusAttributes(page)

  await expect(page.getByRole('heading', { name: 'Overall attributes', level: 3 })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Style wow/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Other attributes', level: 3 })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /Long finish/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Show all categories' }).click()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Long finish/ })).toBeVisible()

  await page.getByRole('button', { name: 'Hide other categories' }).click()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toHaveCount(0)

  const search = page.getByRole('searchbox', { name: 'Search bonus attributes' })
  await search.fill('LONG!!! finish')
  await expect(page.getByRole('checkbox', { name: /Long finish/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Aroma pop/ })).toHaveCount(0)
})

test('custom Overall bonus attribute is created, selected and contributes immediately', async ({ page }) => {
  let createdBody = null
  await page.route('**/api/nocodebackend/bonus-attributes', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    createdBody = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        bonusAttribute: {
          id: 99,
          description: createdBody.description,
          point_value: createdBody.pointValue,
          effective_point_value: createdBody.pointValue,
          category_keys: ['overall']
        },
        category: { key: 'overall', name: 'Overall' }
      })
    })
  })

  await reachAllBonusAttributes(page)

  await page.getByRole('textbox', { name: 'Description' }).fill('Personal wow factor')
  await page.getByRole('spinbutton', { name: 'Point value' }).fill('0.7')
  await page.getByRole('button', { name: 'Add attribute' }).click()

  expect(createdBody).toEqual({ description: 'Personal wow factor', pointValue: 0.7 })
  await expect(page.getByRole('checkbox', { name: /Personal wow factor/ })).toBeChecked()
  await expect(page.getByText('0.70', { exact: true })).toBeVisible()
  await expect(page.getByText('1 / 2', { exact: true })).toBeVisible()
})

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`stored bonus values and explicit defaults remain distinct across both pickers (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await installMockApi(page, { bonusAttributeRows: [
      { id: 10, description: 'Missing legacy value', point_value: null, category_keys: ['aroma', 'overall'] },
      { id: 11, description: 'Stored quarter point', point_value: '0.25', category_keys: ['aroma', 'overall'] },
      { id: 12, description: 'Stored default amount', point_value: 0.2, category_keys: ['overall'] },
      { id: 13, description: 'Stored zero', point_value: 0, category_keys: ['overall'] }
    ] })
    await page.goto('/products/4/rate')
    await page.getByRole('button', { name: 'Skip this attribute' }).click()
    await page.getByRole('button', { name: 'Appearance: 4 out of 7' }).click()

    const defaultName = 'Missing legacy value +0.2 bonus points (default; no stored value)'
    const storedName = 'Stored quarter point +0.25 bonus points'
    const missing = page.getByRole('checkbox', { name: defaultName, exact: true })
    await expect(missing).toBeVisible()
    await missing.focus()
    await page.keyboard.press('Space')
    await expect(missing).toBeChecked()
    await page.getByRole('checkbox', { name: storedName, exact: true }).check()
    await page.getByRole('button', { name: 'Aroma: 4 out of 7' }).click()
    await page.getByRole('button', { name: 'Mouthfeel: 4 out of 7' }).click()
    await page.getByRole('button', { name: 'Flavour: 4 out of 7' }).click()
    await page.getByRole('button', { name: 'Follow: 4 out of 7' }).click()
    await page.getByRole('button', { name: 'Skip this attribute' }).click()

    await expect(page.getByRole('checkbox', { name: defaultName, exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: storedName, exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Stored default amount +0.2 bonus points', exact: true })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Stored zero +0 bonus points', exact: true })).toBeVisible()
    await expect(page.getByText('0.45', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(result.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
  })
}
