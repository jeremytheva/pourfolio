import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const readSource = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('owner profile exposes persistent editing and privacy controls', () => {
  const source = readSource('src/pages/Profile.jsx')

  assert.match(source, /Save profile/)
  assert.match(source, /Share my rating history/)
  assert.match(source, /View my public profile/)
  assert.match(source, /My ratings/)
  assert.match(source, /updateCurrentUserProfile/)
  assert.doesNotMatch(source, /Profile editing is not available yet\./)
})

test('browser profile service reads, updates and resolves public profiles', () => {
  const service = readSource('src/services/profileService.js')

  assert.match(service, /getCurrentUserProfile/)
  assert.match(service, /updateCurrentUserProfile/)
  assert.match(service, /method:\s*['"]PUT['"]/)
  assert.match(service, /getPublicUserProfile/)
})

test('profiles are promoted to the deployed provider contract and use the dedicated gateway', () => {
  const contract = readSource('src/data/contract.js')
  const server = readSource('api/profile-data-proxy.js')
  const router = readSource('api/data-router.js')

  assert.match(contract, /profiles:\s*['"]profiles['"]/)
  assert.match(server, /ensureOwnerProfile/)
  assert.match(server, /updateOwnerProfile/)
  assert.match(server, /loadPublicRatingHistory/)
  assert.doesNotMatch(server, /profile_persistence_unavailable/)
  assert.match(router, /resource === 'profile' \|\| resource === 'profiles'/)
})

test('public profile UI is routed by opaque public profile id and contains no owner actions', () => {
  const app = readSource('src/App.jsx')
  const page = readSource('src/pages/PublicUserProfile.jsx')

  assert.match(app, /\/users\/:publicProfileId/)
  assert.match(page, /Previous ratings this user has chosen to share\./)
  assert.doesNotMatch(page, /Delete rating/)
  assert.doesNotMatch(page, /user\.email/)
  assert.doesNotMatch(page, /cellar_id/)
})
