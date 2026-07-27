import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../[...path].js'

test('authentication proxy exposes only explicit actions', () => {
  assert.deepEqual(__testables.AUTH_ACTIONS['sign-in/email'], ['POST'])
  assert.equal(__testables.AUTH_ACTIONS['arbitrary/admin'], undefined)
})

test('catch-all path parsing preserves only requested action segments', () => {
  assert.equal(__testables.getRequestPath({ query: { path: ['sign-in', 'email'] } }), 'sign-in/email')
})

test('Google redirect targets must match the current request host', () => {
  const request = { headers: { host: 'pourfolio.example' } }
  assert.equal(__testables.safeRedirectTarget(request, 'https://pourfolio.example/profile'), 'https://pourfolio.example')
  assert.equal(__testables.safeRedirectTarget(request, 'https://attacker.example'), null)
})

test('session cookies are scoped to the Pourfolio host and root path', () => {
  const cookie = __testables.secureCookie(
    'session=abc; Domain=app.nocodebackend.com; Path=/api/user-auth; Max-Age=3600'
  )

  assert.doesNotMatch(cookie, /Domain=/i)
  assert.doesNotMatch(cookie, /Path=\/api\/user-auth/i)
  assert.match(cookie, /Path=\//)
  assert.match(cookie, /Max-Age=3600/)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Lax/)
})

test('session cookie normalisation preserves an explicit SameSite policy', () => {
  const cookie = __testables.secureCookie('session=abc; SameSite=None; Secure')

  assert.match(cookie, /SameSite=None/)
  assert.equal((cookie.match(/;\s*Secure/gi) || []).length, 1)
})

test('combined Set-Cookie fallback does not split an Expires date', () => {
  const cookies = __testables.splitSetCookieHeader(
    'session=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/api/user-auth, refresh=def; Path=/api/user-auth'
  )

  assert.deepEqual(cookies, [
    'session=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/api/user-auth',
    'refresh=def; Path=/api/user-auth'
  ])
})
