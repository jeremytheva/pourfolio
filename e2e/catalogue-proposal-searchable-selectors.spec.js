import { expect, test } from '@playwright/test'
import { RATING_DISTRIBUTION_BUCKETS } from '../src/lib/completedRatingContract.js'
import { installMockApi, product } from './mockApi.js'

const secondProduct = {
  ...product,
  id: 5,
  product_name: 'Dark Matter',
  producer_id: 21,
  product_category_id: 11,
  edition: '2026',
  producer: { id: 21, producer_name: 'Other Brewing' },
  category: { id: 11, category_name: 'Stout' }
}

const emptyRatingInsights = {
  distribution: RATING_DISTRIBUTION_BUCKETS.map((bucket) => ({ ...bucket, count: 0 })),
  attributes: []
}

const createdProduct = {
  ...product,
  id: 6,
  product_name: 'New Beer',
  producer_id: 21,
  product_category_id: 11,
  edition: null,
  producer: { id: 21, producer_name: 'Other Brewing' },
  category: { id: 11, category_name: 'Stout' },
  ratingSummary: { count: 0, average: null },
  ratingInsights: emptyRatingInsights,
  ratings: []
}

const installVerifiedRelationshipPage = async (page) => {
  await page.route('**/api/nocodebackend/catalog/producers?page=1&limit=50', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [product.producer, secondProduct.producer],
      page: 1,
      pageSize: 50,
      total: 2,
      totalPages: 1
    })
  }))
  await page.route('**/api/nocodebackend/catalog/categories?page=1&limit=100', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [product.category, secondProduct.category],
      page: 1, pageSize: 100, total: 2, totalPages: 1
    })
  }))
  await page.route('**/api/nocodebackend/catalog/products?page=1&limit=50', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [product, secondProduct], page: 1, pageSize: 50, total: 2, totalPages: 1 })
  }))
}

const installDuplicateSearch = async (page) => {
  await page.route('**/api/nocodebackend/catalog/products?**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('q') !== 'Dark Matter') return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [secondProduct], page: 1, pageSize: 24, total: 1, totalPages: 1 })
    })
  })
}

const installCreatedProductDetail = async (page, override = {}) => {
  const productPayload = { ...createdProduct, ...override }
  await page.route(`**/api/nocodebackend/catalog/products/${productPayload.id}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(productPayload)
  }))
}

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
  await installVerifiedRelationshipPage(page)
})

test('add beer links an existing verified producer and creates the product', async ({ page }) => {
  let submittedBody
  await installCreatedProductDetail(page)
  await page.route('**/api/nocodebackend/catalog/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ product: createdProduct, producerCreated: false })
    })
  })

  await page.goto('/products/propose?name=New%20Beer')
  await expect(page.getByRole('heading', { name: 'Add a beer' })).toBeVisible()
  await expect(page.getByLabel('Product image URL')).toHaveCount(0)
  await expect(page.getByText('Image submission is not available yet.')).toBeVisible()

  const producerPicker = page.getByRole('combobox', { name: 'Brewery / producer' })
  await producerPicker.fill('Other')
  await expect(page.getByRole('option', { name: 'Other Brewing' })).toBeVisible()
  await page.getByRole('option', { name: 'Other Brewing' }).click()

  const stylePicker = page.getByRole('combobox', { name: 'Beer style / category' })
  await stylePicker.fill('Stout')
  await page.getByRole('option', { name: 'Stout' }).click()
  await page.getByLabel('Stated Style (on can/bottle)').fill('Oatmeal Stout')

  const submitButton = page.getByRole('button', { name: 'Add beer to catalogue' })
  await expect(submitButton).toBeDisabled()
  await expect(page.getByText('No likely duplicate was found in the current search results.')).toBeVisible()
  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect(page).toHaveURL(/\/products\/6$/)
  expect(submittedBody.producer_id).toBe('21')
  expect(submittedBody.producers).toEqual([{ producer_id: '21' }])
  expect(submittedBody.collaboration).toBe(false)
  expect(submittedBody.product_category_id).toBe('11')
  expect(submittedBody.product_name).toBe('New Beer')
  expect(submittedBody.declared_category).toBe('Oatmeal Stout')
  expect(submittedBody).not.toHaveProperty('new_producer')
  expect(submittedBody).not.toHaveProperty('user_id')
  expect(submittedBody).not.toHaveProperty('product_image')
})

test('add beer can create a missing producer without exposing raw relationship ids', async ({ page }) => {
  let submittedBody
  await installCreatedProductDetail(page, {
    id: 7,
    producer_id: 31,
    producer: { id: 31, producer_name: 'Brand New Brewing' }
  })
  await page.route('**/api/nocodebackend/catalog/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        product: { ...createdProduct, id: 7, producer_id: 31, producer: { id: 31, producer_name: 'Brand New Brewing' } },
        producerCreated: true
      })
    })
  })

  await page.goto('/products/propose?name=New%20Beer')
  await page.getByRole('combobox', { name: 'Brewery / producer' }).fill('Brand New')
  await page.getByRole('button', { name: /Can't find the brewery\? Add a brewery/ }).click()
  await page.getByLabel('New brewery / producer name').fill('Brand New Brewing')
  await page.getByRole('combobox', { name: 'Beer style / category' }).fill('Stout')
  await page.getByRole('option', { name: 'Stout' }).click()

  await expect(page.getByLabel(/producer id/i)).toHaveCount(0)
  const submitButton = page.getByRole('button', { name: 'Add beer to catalogue' })
  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect(page).toHaveURL(/\/products\/7$/)
  expect(submittedBody.new_producer).toEqual({ producer_name: 'Brand New Brewing' })
  expect(submittedBody.producers).toEqual([{ new_producer: { producer_name: 'Brand New Brewing' } }])
  expect(submittedBody).not.toHaveProperty('producer_id')
  expect(submittedBody).not.toHaveProperty('user_id')
})

test('add beer supports multiple producers and derives collaboration state', async ({ page }) => {
  let submittedBody
  await installCreatedProductDetail(page, {
    id: 8,
    producer_id: 20,
    collaboration: 1,
    producer: product.producer,
    producers: [product.producer, secondProduct.producer]
  })
  await page.route('**/api/nocodebackend/catalog/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedBody = route.request().postDataJSON()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        product: {
          ...createdProduct,
          id: 8,
          producer_id: 20,
          collaboration: 1,
          producer: product.producer,
          producers: [product.producer, secondProduct.producer]
        },
        producerCreated: false,
        producersCreated: 0
      })
    })
  })

  await page.goto('/products/propose?name=New%20Beer')
  await page.getByRole('combobox', { name: 'Brewery / producer' }).fill('Rocky')
  await page.getByRole('option', { name: 'Rocky Ridge Brewing' }).click()
  await page.getByRole('button', { name: 'Add collaborating brewery' }).click()
  await page.getByRole('combobox', { name: 'Collaborating brewery 2 existing producer' }).fill('Other')
  await page.getByRole('option', { name: 'Other Brewing' }).click()
  await page.getByRole('combobox', { name: 'Beer style / category' }).fill('Stout')
  await page.getByRole('option', { name: 'Stout' }).click()

  await expect(page.getByText('2 producers will be linked. This beer will be recorded as a collaboration.')).toBeVisible()
  await page.getByRole('button', { name: 'Add beer to catalogue' }).click()

  await expect(page).toHaveURL(/\/products\/8$/)
  expect(submittedBody.producer_id).toBe('20')
  expect(submittedBody.producers).toEqual([{ producer_id: '20' }, { producer_id: '21' }])
  expect(submittedBody.collaboration).toBe(true)
  expect(submittedBody).not.toHaveProperty('user_id')
})

test('add beer explains style and edition duplicate signals', async ({ page }) => {
  await installDuplicateSearch(page)
  await page.goto('/products/propose?name=Dark%20Matter')

  await page.getByRole('combobox', { name: 'Brewery / producer' }).fill('Other')
  await page.getByRole('option', { name: 'Other Brewing' }).click()
  await page.getByRole('combobox', { name: 'Beer style / category' }).fill('Stout')
  await page.getByRole('option', { name: 'Stout' }).click()
  await page.getByLabel('Edition / vintage').fill('2026')

  const duplicateSection = page.locator('section[aria-labelledby="duplicate-heading"]')
  await expect(duplicateSection.getByText('1 possible duplicate found. Compare the signals below before continuing.')).toBeVisible()
  await expect(duplicateSection.getByRole('link', { name: 'Dark Matter' })).toBeVisible()
  await expect(duplicateSection.getByText('Same primary brewery · same name · same style · same edition')).toBeVisible()

  await page.getByLabel('Edition / vintage').fill('2025')
  await expect(duplicateSection.getByText('Same primary brewery · same name · same style · different edition')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add beer to catalogue' })).toBeEnabled()
})

test('unused canonical style is selectable using reviewed BJCP/BA aliases', async ({ page }) => {
  await page.route('**/api/nocodebackend/catalog/categories?page=1&limit=100', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [product.category, { id: 31, category_name: 'American IPA', parent_id: null }],
      page: 1, pageSize: 100, total: 2, totalPages: 1
    })
  }))
  await page.goto('/products/propose?name=Test%20IPA')
  const stylePicker = page.getByRole('combobox', { name: 'Beer style / category' })
  await stylePicker.fill('21A')
  await expect(page.getByRole('option', { name: /American IPA.*BJCP 21A/ })).toBeVisible()
  await page.getByRole('option', { name: /American IPA.*BJCP 21A/ }).click()
  await expect(stylePicker).toHaveValue('American IPA')
  await expect(page.getByText(/Mapped style guidance: BJCP 21A: American IPA/)).toBeVisible()
  await expect(stylePicker).toHaveAttribute('aria-describedby', /beer-style-hint beer-style-status/)
  await expect(page.getByText('Verified BJCP/BA equivalents appear in brackets')).toBeVisible()
})

test('brewery picker supports keyboard choice and clearing an obsolete selected producer ID', async ({ page }) => {
  await page.goto('/products/propose?name=Keyboard%20Beer')
  const picker = page.getByRole('combobox', { name: 'Brewery / producer' })
  await picker.focus()
  await picker.press('ArrowDown')
  await picker.press('Enter')
  await expect(picker).not.toHaveValue('')
  await picker.fill('not-a-brewery')
  await expect(page.getByRole('button', { name: 'Add beer to catalogue' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Can't find the brewery\? Add a brewery/ })).toBeVisible()
})

test('collaborator brewery picker rejects duplicate primary selection and remains searchable after removal', async ({ page }) => {
  await page.goto('/products/propose?name=Collaboration%20Check')
  await page.getByRole('combobox', { name: 'Brewery / producer' }).fill('Rocky')
  await page.getByRole('option', { name: 'Rocky Ridge Brewing' }).click()
  await page.getByRole('button', { name: 'Add collaborating brewery' }).click()

  const firstCollaborator = page.getByRole('combobox', { name: 'Collaborating brewery 2 existing producer' })
  await firstCollaborator.fill('Rocky')
  await page.getByRole('option', { name: 'Rocky Ridge Brewing' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Each producer can only be linked once.' })).toBeVisible()

  await firstCollaborator.fill('Other')
  await page.getByRole('option', { name: 'Other Brewing' }).click()
  await expect(page.getByText('Each producer can only be linked once.')).toHaveCount(0)

  await page.getByRole('button', { name: 'Add collaborating brewery' }).click()
  const secondCollaborator = page.getByRole('combobox', { name: 'Collaborating brewery 3 existing producer' })
  await secondCollaborator.fill('Other')
  await page.getByRole('option', { name: 'Other Brewing' }).click()
  await expect(page.getByText('Each producer can only be linked once.')).toBeVisible()

  await page.getByRole('button', { name: 'Remove' }).first().click()
  await expect(page.getByRole('combobox', { name: 'Collaborating brewery 2 existing producer' })).toHaveValue('Other Brewing')
  await expect(page.getByText('Each producer can only be linked once.')).toHaveCount(0)
})
