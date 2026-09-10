import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const readSource = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('launch profile page exposes session-backed identity without a persistence form', () => {
  const source = readSource('src/pages/Profile.jsx')

  assert.match(source, /Profile editing is not available yet\./)
  assert.match(source, /authenticated session/)
  assert.doesNotMatch(source, /Save profile/)
  assert.doesNotMatch(source, /updateProfile/)
  assert.doesNotMatch(source, /onSubmit=\{saveProfile\}/)
})

test('browser profile and sign-up flows do not write the unavailable profile capability', () => {
  const service = readSource('src/services/profileService.js')
  const auth = readSource('src/hooks/useAuth.js')

  assert.match(service, /getCurrentUserProfile/)
  assert.doesNotMatch(service, /method:\s*['"]PUT['"]/)
  assert.doesNotMatch(service, /updateCurrentUserProfile/)
  assert.doesNotMatch(auth, /updateCurrentUserProfile/)
  assert.doesNotMatch(auth, /updateProfile/)
})

test('server profile writes remain explicitly unavailable until persistence is deployed', () => {
  const server = readSource('api/profile-data-proxy.js')

  assert.match(server, /request\.method === 'GET'/)
  assert.match(server, /profile_persistence_unavailable/)
  assert.match(server, /writeJson\(response, 503/)
})
