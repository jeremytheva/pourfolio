import assert from 'node:assert/strict'
import test from 'node:test'

import profileHandler from '../profile-data-proxy.js'

const originalFetch = global.fetch
const originalEnvironment = {
  NOCODEBACKEND_AUTH_SECRET_KEY: process.env.NOCODEBACKEND_AUTH_SECRET_KEY,
  NOCODEBACKEND_SECRET_KEY: process.env.NOCODEBACKEND_SECRET_KEY,
  NOCODEBACKEND_INSTANCE: process.env.NOCODEBACKEND_INSTANCE,
  NOCODEBACKEND_AUTH_BASE_URL: process.env.NOCODEBACKEND_AUTH_BASE_URL,
  NOCODEBACKEND_DATA_BASE_URL: process.env.NOCODEBACKEND_DATA_BASE_URL
}

const createResponse = () => ({
  headers: {}, statusCode: null, body: null,
  setHeader(name, value) { this.headers[name] = value },
  status(statusCode) { this.statusCode = statusCode; return this },
  json(body) { this.body = body; return this }
})

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
})

const installProvider = ({ profiles = [], ratings = [], updateProfile, readProfiles } = {}) => {
  const requests = []
  const state = { profiles: structuredClone(profiles), ratings: structuredClone(ratings) }
  let profileReads = 0
  global.fetch = async (url, options = {}) => {
    const parsed = new URL(String(url))
    requests.push({ url: String(url), method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null })

    if (parsed.hostname === 'app.nocodebackend.com') {
      return json({ user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } })
    }
    if (parsed.pathname === '/read/profiles') {
      const userId = parsed.searchParams.get('user_id')
      const publicId = parsed.searchParams.get('public_id')
      const records = state.profiles.filter((record) => (!userId || record.user_id === userId) && (!publicId || record.public_id === publicId))
      profileReads += 1
      return readProfiles ? readProfiles(records, profileReads) : json(records)
    }
    if (parsed.pathname === '/create/profiles') {
      const record = { id: state.profiles.length + 1, ...JSON.parse(options.body) }
      state.profiles.push(record)
      return json(record)
    }
    if (parsed.pathname.startsWith('/update/profiles/')) {
      const id = parsed.pathname.split('/').pop()
      const index = state.profiles.findIndex((record) => String(record.id) === id)
      if (index < 0) return json({ error: 'not found' }, 404)
      const changes = JSON.parse(options.body)
      const result = updateProfile
        ? updateProfile(state.profiles[index], changes)
        : { saved: { ...state.profiles[index], ...changes } }
      state.profiles[index] = result.saved
      return json(Object.hasOwn(result, 'response') ? result.response : result.saved)
    }
    if (parsed.pathname === '/read/ratings') {
      const userId = parsed.searchParams.get('user_id')
      return json(state.ratings.filter((record) => !userId || record.user_id === userId))
    }
    if (parsed.pathname === '/read/products/4') {
      return json({ id: 4, product_name: 'Ace', producer_id: 20 })
    }
    if (parsed.pathname === '/read/producers/20') {
      return json({ id: 20, producer_name: 'Rocky Ridge Brewing' })
    }
    throw new Error(`Unexpected provider request: ${parsed.pathname}`)
  }
  return { requests, state }
}

const ownerProfile = (overrides = {}) => ({
  id: 7,
  user_id: 'user-1',
  public_id: 'profile_abcdefgh1234',
  name: 'Test User',
  description: '',
  avatar_url: null,
  rating_history_public: 0,
  ...overrides
})

const call = async ({ method = 'GET', path = ['profile'], body } = {}) => {
  const response = createResponse()
  await profileHandler({ method, headers: { cookie: 'session=test' }, query: { path }, body }, response)
  return response
}

test.beforeEach(() => {
  process.env.NOCODEBACKEND_AUTH_SECRET_KEY = 'test-auth-secret'
  process.env.NOCODEBACKEND_SECRET_KEY = 'test-data-secret'
  process.env.NOCODEBACKEND_INSTANCE = 'test-instance'
  process.env.NOCODEBACKEND_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
  process.env.NOCODEBACKEND_DATA_BASE_URL = 'https://api.nocodebackend.com/'
})

test.afterEach(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('owner GET creates one private profile with a server-generated public id', async () => {
  const { state } = installProvider()
  const response = await call()

  assert.equal(response.statusCode, 200)
  assert.equal(state.profiles.length, 1)
  assert.equal(state.profiles[0].user_id, 'user-1')
  assert.notEqual(state.profiles[0].public_id, 'user-1')
  assert.equal(state.profiles[0].rating_history_public, 0)
  assert.equal(response.body.profile.rating_history_public, false)
  assert.equal(response.body.profile.name, 'Test User')
  assert.equal('user_id' in response.body.profile, false)
})

test('owner PUT allowlists editable fields and cannot replace ownership or public identity', async () => {
  const { state } = installProvider({ profiles: [ownerProfile()] })
  const response = await call({
    method: 'PUT',
    body: { name: 'Changed', rating_history_public: true, user_id: 'other-user', public_id: 'chosen-public-id' }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(state.profiles[0].user_id, 'user-1')
  assert.equal(state.profiles[0].public_id, 'profile_abcdefgh1234')
  assert.equal(state.profiles[0].name, 'Changed')
  assert.equal(state.profiles[0].rating_history_public, 1)
  assert.equal(response.body.profile.rating_history_public, true)
})

test('owner PUT rejects a privacy revocation that did not persist', async () => {
  const { state } = installProvider({
    profiles: [ownerProfile({ rating_history_public: 1 })],
    updateProfile: (saved) => ({ saved })
  })
  const response = await call({ method: 'PUT', body: { rating_history_public: false } })

  assert.equal(response.statusCode, 502)
  assert.equal(response.body.code, 'profile_provider_invalid')
  assert.equal(state.profiles[0].rating_history_public, 1)
  assert.equal('profile' in response.body, false)
})

test('owner PUT verifies stored privacy despite an optimistic update response', async () => {
  installProvider({
    profiles: [ownerProfile({ rating_history_public: 1 })],
    updateProfile: (saved, changes) => ({ saved, response: { ...saved, ...changes } })
  })
  const response = await call({ method: 'PUT', body: { rating_history_public: false } })

  assert.equal(response.statusCode, 502)
  assert.equal(response.body.code, 'profile_provider_invalid')
  assert.equal('profile' in response.body, false)
})

for (const updateResponse of [null, { success: true }, { rating_history_public: 0 }]) {
  test(`owner PUT verifies persisted revocation after ${JSON.stringify(updateResponse)} update response`, async () => {
    const { requests } = installProvider({
      profiles: [ownerProfile({ rating_history_public: 1 })],
      updateProfile: (saved, changes) => ({ saved: { ...saved, ...changes }, response: updateResponse })
    })
    const response = await call({ method: 'PUT', body: { rating_history_public: false } })

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.profile.rating_history_public, false)
    const updateIndex = requests.findIndex(({ url }) => url.includes('/update/profiles/'))
    assert.equal(requests.slice(updateIndex + 1).some(({ url }) => url.includes('/read/profiles')), true)

    const publicResponse = await call({ path: ['profiles', 'profile_abcdefgh1234'] })
    assert.equal(publicResponse.statusCode, 200)
    assert.deepEqual(publicResponse.body.ratings, [])
    assert.equal(requests.some(({ url }) => url.includes('/read/ratings')), false)
  })
}

for (const privacy of [undefined, null, '', 'false', 2]) {
  test(`owner PUT cannot confirm revocation from invalid stored privacy ${JSON.stringify(privacy)}`, async () => {
    installProvider({
      profiles: [ownerProfile({ rating_history_public: 1 })],
      updateProfile: (saved) => ({ saved: { ...saved, rating_history_public: privacy }, response: null })
    })
    const response = await call({ method: 'PUT', body: { rating_history_public: false } })

    assert.equal(response.statusCode, 502)
    assert.equal(response.body.code, 'profile_provider_invalid')
    assert.equal('profile' in response.body, false)
  })
}

for (const privacy of [false, 0, '0', true, 1, '1']) {
  test(`owner PUT accepts persisted boolean-like privacy ${JSON.stringify(privacy)}`, async () => {
    const expectedPublic = [true, 1, '1'].includes(privacy)
    installProvider({
      profiles: [ownerProfile({ rating_history_public: expectedPublic ? 0 : 1 })],
      updateProfile: (saved, changes) => ({ saved: { ...saved, ...changes, rating_history_public: privacy } })
    })
    const response = await call({ method: 'PUT', body: { rating_history_public: expectedPublic } })

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.profile.rating_history_public, expectedPublic)
  })
}

for (const identityChange of [{ id: 8 }, { public_id: 'different_public_profile' }, { user_id: 'other-user' }]) {
  test(`owner PUT rejects changed persisted identity ${JSON.stringify(identityChange)}`, async () => {
    installProvider({
      profiles: [ownerProfile({ rating_history_public: 1 })],
      updateProfile: (saved, changes) => ({ saved: { ...saved, ...changes, ...identityChange } })
    })
    const response = await call({ method: 'PUT', body: { rating_history_public: false } })

    assert.equal(response.statusCode, 502)
    assert.equal(response.body.code, 'profile_provider_invalid')
    assert.equal('profile' in response.body, false)
  })
}

test('owner PUT cannot confirm a save when the persisted profile is missing', async () => {
  installProvider({
    profiles: [ownerProfile()],
    readProfiles: (records, count) => json(count === 1 ? records : [])
  })
  const response = await call({ method: 'PUT', body: { name: 'Changed' } })

  assert.equal(response.statusCode, 502)
  assert.equal(response.body.code, 'profile_provider_invalid')
  assert.equal('profile' in response.body, false)
})

test('owner PUT reports readback failure without claiming the persisted update failed', async () => {
  const { state } = installProvider({
    profiles: [ownerProfile({ rating_history_public: 1 })],
    readProfiles: (records, count) => count === 1 ? json(records) : json({ error: 'Unavailable' }, 503)
  })
  const response = await call({ method: 'PUT', body: { rating_history_public: false } })

  assert.equal(response.statusCode, 503)
  assert.equal(response.body.code, 'provider_error')
  assert.equal(state.profiles[0].rating_history_public, 0)
  assert.equal('profile' in response.body, false)
})

test('owner PUT rejects other editable fields that did not persist', async () => {
  installProvider({
    profiles: [ownerProfile()],
    updateProfile: (saved) => ({ saved })
  })
  const response = await call({ method: 'PUT', body: { name: 'Changed' } })

  assert.equal(response.statusCode, 502)
  assert.equal(response.body.code, 'profile_provider_invalid')
  assert.equal('profile' in response.body, false)
})

test('private profile lookup exposes safe profile fields but does not read rating history', async () => {
  const { requests } = installProvider({ profiles: [ownerProfile()] })
  const response = await call({ path: ['profiles', 'profile_abcdefgh1234'] })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, {
    profile: { public_id: 'profile_abcdefgh1234', name: 'Test User', description: '', avatar_url: null },
    ratings: [],
    summary: { count: 0, average: null }
  })
  assert.equal(requests.some((request) => request.url.includes('/read/ratings')), false)
})

test('opted-in public profile returns only projected rated beer history', async () => {
  installProvider({
    profiles: [ownerProfile({ rating_history_public: 1 })],
    ratings: [{
      id: 99, user_id: 'user-1', product_id: 4, cellar_id: 55,
      date_rated: '2026-09-11T08:00:00.000Z', total_unweighted: 4.5, total_weighted: 4.25,
      submission_key: 'private', submission_state: 'complete'
    }]
  })
  const response = await call({ path: ['profiles', 'profile_abcdefgh1234'] })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.summary.count, 1)
  assert.equal(response.body.summary.average, 4.25)
  assert.deepEqual(response.body.ratings[0], {
    id: 99,
    product_id: 4,
    date_rated: '2026-09-11T08:00:00.000Z',
    total_unweighted: 4.5,
    total_weighted: 4.25,
    product: { id: 4, product_name: 'Ace', producer: { id: 20, producer_name: 'Rocky Ridge Brewing' } }
  })
  assert.equal(JSON.stringify(response.body).includes('user_id'), false)
  assert.equal(JSON.stringify(response.body).includes('cellar_id'), false)
  assert.equal(JSON.stringify(response.body).includes('submission_key'), false)
})

test('public profile route rejects malformed identifiers before profile provider reads', async () => {
  const { requests } = installProvider({ profiles: [ownerProfile()] })
  const response = await call({ path: ['profiles', '../owner-secret'] })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.code, 'invalid_profile_identifier')
  assert.equal(requests.some((request) => request.url.includes('/read/profiles')), false)
})

