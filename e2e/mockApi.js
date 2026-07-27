export const product = {
  id: 4,
  product_name: 'Ace',
  product_category_id: 10,
  producer_id: 20,
  abv: 5.2,
  ibu: '35',
  declared_category: 'Pale Ale',
  edition: null,
  product_image: null,
  producer: { id: 20, producer_name: 'Rocky Ridge Brewing' },
  category: { id: 10, category_name: 'Pale Ale' }
}

const rating = {
  id: 99,
  rating_id: 1700000000000001,
  product_id: 4,
  cellar_id: null,
  date_rated: '2026-07-27T00:00:00.000Z',
  total_unweighted: 4,
  total_weighted: 4
}

export const installMockApi = async (page) => {
  await page.route('**/api/nocodebackend/auth/get-session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { id: 'user-1', email: 'jeremy@example.com', name: 'Jeremy' } })
  }))

  await page.route('**/api/nocodebackend/profile', async (route) => {
    const body = route.request().method() === 'PUT'
      ? { profile: { id: 'user-1', ...route.request().postDataJSON() } }
      : { profile: { id: 'user-1', name: 'Jeremy', description: '', avatar_url: null } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.route('**/api/nocodebackend/catalog/products?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [product], page: 1, pageSize: 24, total: 1, totalPages: 1 })
  }))

  await page.route('**/api/nocodebackend/catalog/products/4', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...product,
      ratingSummary: { count: 1, average: 4 },
      ratings: [rating]
    })
  }))

  await page.route('**/api/nocodebackend/rating-form?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      product,
      attributes: [
        { id: 2, attribute_name: 'Appearance', is_scored: 1, weighting: 0.1 },
        { id: 3, attribute_name: 'Aroma', is_scored: 1, weighting: 0.2 }
      ],
      bonusAttributes: [
        { id: 10, description: 'Better than expected for style', point_value: 0.1 }
      ]
    })
  }))

  await page.route('**/api/nocodebackend/ratings/submit', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ rating, scoreCount: 2, bonusCount: 0, duplicate: false })
  }))

  await page.route('**/api/nocodebackend/ratings/mine', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{ ...rating, product }] })
  }))

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ item: { id: 55, product_id: 4, quantity: 1, product } })
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          id: 55,
          product_id: 4,
          quantity: 1,
          mls: 375,
          container: 'Bottle',
          purchase_price: 5,
          retail_price: 7,
          date_received: '2026-07-20',
          sharing_series_id: null,
          series_version_id: null,
          notes: 'Launch test',
          product
        }]
      })
    })
  })

  await page.route('**/api/nocodebackend/cellar/55', async (route) => {
    if (route.request().method() === 'DELETE') return route.fulfill({ status: 204, body: '' })
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        item: {
          id: 55,
          product_id: 4,
          ...route.request().postDataJSON(),
          sharing_series_id: null,
          series_version_id: null,
          product
        }
      })
    })
  })
}
