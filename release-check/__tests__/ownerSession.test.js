import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { restoreReleaseOwnerSession, saveReleaseOwnerSession } from '../ownerSession.js'

const fixture = (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-owner-session-test-'))
  const environment = {
    RELEASE_OWNER_SESSION_PATH: path.join(directory, 'session.json'),
    RELEASE_SHA: 'a'.repeat(40),
    RELEASE_BASE_URL: 'https://brew-buds-mobile-app-design-3577.vercel.app',
    RELEASE_OWNER_EMAIL: 'owner@example.test'
  }
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]))
  Object.assign(process.env, environment)
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    fs.rmSync(directory, { recursive: true, force: true })
  })
  const cookie = { name: 'session', value: 'private-fixture-cookie', domain: new URL(environment.RELEASE_BASE_URL).hostname, path: '/' }
  const calls = { cookies: 0, cleared: 0, requests: [], navigation: [] }
  let status = 200
  let email = environment.RELEASE_OWNER_EMAIL
  const page = {
    context: () => ({ addCookies: async () => { calls.cookies += 1 }, clearCookies: async () => { calls.cleared += 1 } }),
    request: { get: async (url) => { calls.requests.push(url); return { status: () => status, json: async () => ({ user: { id: 'owner-a', email } }) } } },
    goto: async (url) => { calls.navigation.push(url) }
  }
  return { environment, cookie, calls, page, setResponse: (code, nextEmail = email) => { status = code; email = nextEmail } }
}

test('owner session is private, target-scoped and omits email and browser storage', (context) => {
  const { environment, cookie } = fixture(context)
  saveReleaseOwnerSession({ cookies: [cookie, { ...cookie, domain: 'other.example.test' }], origins: [{ localStorage: [{ name: 'profile', value: 'private-profile-fixture' }] }] }, environment.RELEASE_OWNER_EMAIL)
  const text = fs.readFileSync(environment.RELEASE_OWNER_SESSION_PATH, 'utf8')
  assert.equal(fs.statSync(environment.RELEASE_OWNER_SESSION_PATH).mode & 0o077, 0)
  assert.equal(JSON.parse(text).cookies.length, 1)
  assert.equal(text.includes(environment.RELEASE_OWNER_EMAIL), false)
  assert.equal(text.includes('private-profile-fixture'), false)
})

test('matching cached session is verified with the server before reuse', async (context) => {
  const { environment, cookie, page, calls } = fixture(context)
  saveReleaseOwnerSession({ cookies: [cookie] }, environment.RELEASE_OWNER_EMAIL)
  assert.equal(await restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL), true)
  assert.equal(calls.cookies, 1)
  assert.deepEqual(calls.requests, ['/api/nocodebackend/auth/get-session'])
  assert.deepEqual(calls.navigation, ['/home'])
})

test('cache cannot be reused across a release, origin or owner, or overwritten by another account', async (context) => {
  const { environment, cookie, page, calls } = fixture(context)
  saveReleaseOwnerSession({ cookies: [cookie] }, environment.RELEASE_OWNER_EMAIL)
  const saved = fs.readFileSync(environment.RELEASE_OWNER_SESSION_PATH, 'utf8')
  saveReleaseOwnerSession({ cookies: [{ ...cookie, value: 'other-account-fixture' }] }, 'other@example.test')
  assert.equal(fs.readFileSync(environment.RELEASE_OWNER_SESSION_PATH, 'utf8'), saved)
  for (const changes of [{ sha: 'b'.repeat(40) }, { origin: 'https://other.example.test' }, { owner: 'different-owner' }]) {
    fs.writeFileSync(environment.RELEASE_OWNER_SESSION_PATH, JSON.stringify({ ...JSON.parse(saved), ...changes }))
    assert.equal(await restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL), false)
  }
  assert.equal(calls.cookies, 0)
  assert.equal(calls.requests.length, 0)
})

test('expired and changed-owner sessions are cleared and require a fresh sign-in', async (context) => {
  const { environment, cookie, page, calls, setResponse } = fixture(context)
  saveReleaseOwnerSession({ cookies: [cookie] }, environment.RELEASE_OWNER_EMAIL)
  setResponse(401)
  assert.equal(await restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL), false)
  setResponse(200, 'other@example.test')
  assert.equal(await restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL), false)
  assert.equal(calls.cleared, 2)
  assert.equal(calls.navigation.length, 0)
})

test('unavailable auth verification and non-private cache permissions fail closed', async (context) => {
  const { environment, cookie, page, setResponse } = fixture(context)
  saveReleaseOwnerSession({ cookies: [cookie] }, environment.RELEASE_OWNER_EMAIL)
  setResponse(503)
  await assert.rejects(restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL), /could not be verified/)
  fs.chmodSync(environment.RELEASE_OWNER_SESSION_PATH, 0o644)
  await assert.rejects(restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL), /must be private/)
})

test('malformed cache never exposes cookie contents in its error', async (context) => {
  const { environment, page } = fixture(context)
  fs.writeFileSync(environment.RELEASE_OWNER_SESSION_PATH, '{private-fixture-cookie', { mode: 0o600 })
  await assert.rejects(restoreReleaseOwnerSession(page, environment.RELEASE_OWNER_EMAIL),
    (error) => error.message === 'The release owner session file is invalid.' && !error.message.includes('private-fixture-cookie'))
})
