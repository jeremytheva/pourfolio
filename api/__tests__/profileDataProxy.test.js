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

const installProvider = ({ profiles = [], ratings = [] } = {}) => {
  const requests = []
  const state = { profiles: structuredClone(profiles), ratings: structuredClone(ratings) }
  global.fetch = async (url, options = {}) => {
    const parsed = new URL(String(url))
    requests.push({ url: String(url), method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null })

    if (parsed.hostname === 'app.nocodebackend.com') {
      return json({ user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } })
    }
    if (parsed.pathname === '/read/profiles') {
      const userId = parsed.searchParams.get('user_id')
      const publicId = parsed.searchParams.get('public_id')
      return json(state.profiles.filter((record) => (!userId || record.user_id === userId) && (!publicId || record.public_id === publicId)))
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
      state.profiles[index] = { ...state.profiles[index], ...JSON.parse(options.body) }
      return json(state.profiles[index])
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
