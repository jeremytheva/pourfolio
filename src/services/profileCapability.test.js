import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const readSource = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('launch owner profile exposes session-backed identity without a persistence form', () => {
  const source = readSource('src/pages/Profile.jsx')

  assert.match(source, /Profile editing is not available yet\./)
  assert.match(source, /authenticated session/)
  assert.match(source, /My ratings/)
  assert.doesNotMatch(source, /Save profile/)
  assert.doesNotMatch(source, /updateProfile/)
  assert.doesNotMatch(source, /onSubmit=\{saveProfile\}/)
})

test('browser owner profile and sign-up flows do not write the unavailable profile capability', () => {
  const service = readSource('src/services/profileService.js')
  const auth = readSource('src/hooks/useAuth.js')

  assert.match(service, /getCurrentUserProfile/)
  assert.match(service, /getPublicUserProfile/)
  assert.doesNotMatch(service, /method:\s*['"]PUT['"]/)
  assert.doesNotMatch(service, /updateCurrentUserProfile/)
  assert.doesNotMatch(auth, /updateCurrentUserProfile/)
  assert.doesNotMatch(auth, /updateProfile/)
})

test('server profile writes and public profile reads remain explicitly unavailable until persistence is deployed', () => {
  const server = readSource('api/profile-data-proxy.js')
  const router = readSource('api/data-router.js')

  assert.match(server, /request\.method === 'GET'/)
  assert.match(server, /profile_persistence_unavailable/)
  assert.match(server, /rating_history_public/)
  assert.match(server, /writeJson\(response, 503/)
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
