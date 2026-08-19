import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../../../auth-proxy.js'

test('authentication proxy exposes only explicit actions', () => {
  assert.deepEqual(__testables.AUTH_ACTIONS['sign-in/email'], ['POST'])
  assert.equal(__testables.AUTH_ACTIONS['arbitrary/admin'], undefined)
})

test('catch-all path parsing preserves only requested action segments', () => {
  assert.equal(__testables.getRequestPath({ query: { path: ['sign-in', 'email'] } }), 'sign-in/email')
})

test('authentication upstream URLs use the lowercase auth instance selector', () => {
  const request = { query: {}, headers: { host: 'pourfolio.example' } }
  for (const action of ['providers', 'get-session', 'sign-in/email']) {
    const url = __testables.buildUpstreamUrl(request, action)
    assert.equal(url.searchParams.get('instance'), '54026_rating')
    assert.equal(url.searchParams.has('Instance'), false)
    assert.equal(url.pathname.endsWith(`/api/user-auth/${action}`), true)
  }
})

test('authentication upstream requests also carry the database instance server-side header', () => {
  const headers = __testables.buildUpstreamHeaders({ headers: { cookie: 'session=abc' } }, 'server-secret')
  assert.equal(headers['x-database-instance'], '54026_rating')
  assert.equal(headers.authorization, 'Bearer server-secret')
  assert.equal(headers.cookie, 'session=abc')
})

test('provider discovery exposes only enabled-provider state to the browser', () => {
  const safeBody = __testables.sanitizeProviderBody(Buffer.from(JSON.stringify({
    providers: { email: true, google: false },
    baseUrl: 'https://provider.example.test/api/user-auth',
    requiredHeaders: {
      'X-Database-Instance': 'example-instance',
      Authorization: 'Bearer <SECRET_KEY>'
    }
  })))

  assert.deepEqual(JSON.parse(safeBody.toString('utf8')), {
    providers: { email: true, google: false }
  })
  assert.equal(__testables.sanitizeProviderBody(Buffer.from('{"baseUrl":"private"}')), null)
})

test('Google redirect targets must match the current request host', () => {
  const request = { headers: { host: 'pourfolio.example' } }
  assert.equal(__testables.safeRedirectTarget(request, 'https://pourfolio.example/profile'), 'https://pourfolio.example')
  assert.equal(__testables.safeRedirectTarget(request, 'https://attacker.example'), null)
})

test('Google auth keeps the safe same-origin redirect and lowercase auth instance selector', () => {
  const request = {
    headers: { host: 'pourfolio.example' },
    query: { redirectTo: 'https://pourfolio.example/profile' }
  }
  const url = __testables.buildUpstreamUrl(request, 'sign-in/google')
  assert.equal(url.searchParams.get('redirectTo'), 'https://pourfolio.example')
  assert.equal(url.searchParams.get('instance'), '54026_rating')
  assert.equal(url.searchParams.has('Instance'), false)
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