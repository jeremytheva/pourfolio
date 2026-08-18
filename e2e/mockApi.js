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
  let brewRound = null
  let brewGame = null
  let guessCount = 0
  let staleOnce = true
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

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
      ratings: []
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

  await page.route('**/api/nocodebackend/brew-done-it/stats', (route) => json(route, {
    completedGames: brewRound?.status === 'completed' ? 1 : 0,
    completedRounds: brewRound?.status === 'completed' ? 1 : 0,
    awardedPoints: brewRound?.awarded_points || 0
  }))

  await page.route('**/api/nocodebackend/brew-done-it/games', async (route) => {
    brewGame = { id: 71, selector_participant_id: 'user-1', guesser_participant_id: null, status: 'waiting', version: 0 }
    await json(route, { game: brewGame, invitationCode: 'mock_invitation_code_12345678901234567890' }, 201)
  })

  await page.route('**/api/nocodebackend/brew-done-it/games/71/join', async (route) => {
    brewGame = { ...brewGame, guesser_participant_id: 'user-2', status: 'active', version: 1 }
    brewRound = { id: 81, game_id: 71, selector_participant_id: 'user-1', guesser_participant_id: 'user-2', status: 'awaiting_selection', turn_sequence: 0, max_turns: 6, question_count: 0, version: 0 }
    await json(route, { game: brewGame, round: brewRound })
  })

  await page.route('**/api/nocodebackend/brew-done-it/games/71', async (route) => {
    if (brewRound?.status === 'guessing') brewGame = { ...brewGame, selector_participant_id: 'user-2', guesser_participant_id: 'user-1' }
    await json(route, { game: brewGame, rounds: brewRound ? [brewRound] : [] })
  })

  await page.route('**/api/nocodebackend/brew-done-it/rounds/81/selection', async (route) => {
    brewRound = { ...brewRound, status: 'guessing', version: 1, selected_product_id: 4 }
    await json(route, { round: brewRound })
  })

  await page.route('**/api/nocodebackend/brew-done-it/rounds/81/history-questions', async (route) => {
    brewRound = { ...brewRound, version: brewRound.version + 1, question_count: 1 }
    await json(route, { predicate: route.request().postDataJSON().predicate, answer: true, version: brewRound.version })
  })

  await page.route('**/api/nocodebackend/brew-done-it/rounds/81/guesses', async (route) => {
    const body = route.request().postDataJSON()
    if (body.guessType === 'style' && staleOnce) {
      staleOnce = false
      return json(route, { error: 'The game changed before this request was applied.', code: 'VERSION_CONFLICT', currentVersion: brewRound.version }, 409)
    }
    guessCount += 1
    const completed = body.guessType === 'product'
    brewRound = { ...brewRound, version: brewRound.version + 1, turn_sequence: guessCount, status: completed ? 'completed' : 'guessing', ...(completed ? { selected_product_id: 4, completion_reason: 'correct_guess', awarded_points: 12, scoring_rules_version: '1.0.0' } : {}) }
    if (completed) brewGame = { ...brewGame, status: 'completed' }
    await json(route, { guess: { awarded_points: body.guessType === 'style' ? 3 : body.guessType === 'producer' ? 5 : 10 }, round: brewRound }, 201)
  })
}
