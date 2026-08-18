import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { dataProvider } from '../../_lib/dataProvider.js'
import { __testables } from '../../data-proxy.js'

const originalProviderMethods = { ...dataProvider }

afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
})

const createResponse = () => {
  const response = {
    body: null,
    statusCode: null,
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    json(body) {
      this.body = body
      return this
    }
  }
  return response
}

test('profile reads do not expose a record owned by another user even when its primary id matches the session user', async () => {
  const user = { id: 'session-user', name: 'Session User' }
  dataProvider.list = async () => [{
    id: user.id,
    user_id: 'other-user',
    name: 'Other User',
    description: 'Private profile details'
  }]
  dataProvider.get = async () => {
    assert.fail('profile lookup must not infer ownership through a primary-id request')
  }
  const response = createResponse()

  await __testables.getProfile(response, user)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, {
    profile: {
      id: user.id,
      name: user.name,
      description: '',
      avatar_url: null
    }
  })
})

test('profile lookup accepts an owned record with an unrelated provider primary id', async () => {
  const ownedProfile = {
    id: 'provider-profile-42',
    user_id: 'session-user',
    name: 'Owned Profile'
  }
  dataProvider.list = async (collection, filters) => {
    assert.deepEqual(filters, { user_id: 'session-user' })
    return [ownedProfile]
  }

  assert.equal(await __testables.findProfile('session-user'), ownedProfile)
})

test('profile updates never modify a primary-id match owned by another user', async () => {
  const user = { id: 'session-user', name: 'Session User' }
  const mismatchedProfile = {
    id: user.id,
    user_id: 'other-user',
    name: 'Other User'
  }
  dataProvider.list = async () => [mismatchedProfile]
  dataProvider.update = async () => {
    assert.fail('an unowned profile must never be updated')
  }
  dataProvider.create = async (collection, body) => ({
    provider_id: 'new-profile',
    ...body
  })
  const response = createResponse()

  await __testables.updateProfile({ body: { name: 'My Profile' } }, response, user)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.profile.name, 'My Profile')
  assert.notEqual(response.body.profile.name, mismatchedProfile.name)
  assert.equal(response.body.profile.id, user.id)
})

test('profile updates target the provider primary id only after user_id ownership is verified', async () => {
  const user = { id: 'session-user', name: 'Session User' }
  const ownedProfile = {
    id: 'provider-profile-42',
    user_id: user.id,
    name: 'Old Name'
  }
  let updatedId = null
  dataProvider.list = async () => [ownedProfile]
  dataProvider.update = async (collection, id, updates) => {
    updatedId = id
    return { ...ownedProfile, ...updates }
  }

  const response = createResponse()
  await __testables.updateProfile({ body: { name: 'New Name' } }, response, user)

  assert.equal(updatedId, ownedProfile.id)
  assert.equal(response.body.profile.name, 'New Name')
})