import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import authHandler, { __testables as authProxy } from '../auth-proxy.js'
import { pathSegments as dataRouterPathSegments, __testables as dataRouter } from '../data-router.js'
import internalNotFoundHandler from '../internal-not-found.js'

const INTERNAL_DATA_HANDLER_PATHS = [
  '/api/catalog-data-proxy',
  '/api/cellar-data-proxy',
  '/api/current-data-proxy',
  '/api/profile-data-proxy',
  '/api/data-proxy'
]

const loadVercelConfiguration = async () => JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
)

const matchRewrite = (rewrite, pathname, query = {}) => {
  if (rewrite.source === pathname) {
    const destination = new URL(rewrite.destination, 'https://pourfolio.test')
    return {
      destination: destination.pathname,
      query: { ...query, ...Object.fromEntries(destination.searchParams.entries()) }
    }
  }

  const wildcardMarker = '/:path*'
  if (rewrite.source.endsWith(wildcardMarker)) {
    const prefix = rewrite.source.slice(0, -wildcardMarker.length)
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const capture = pathname.slice(prefix.length).replace(/^\//, '')
      const destination = new URL(rewrite.destination, 'https://pourfolio.test')
      const rewrittenQuery = { ...query }

      for (const [key, value] of destination.searchParams.entries()) {
        rewrittenQuery[key] = value === ':path*' ? capture : value
      }

      return {
        destination: destination.pathname,
        query: rewrittenQuery
      }
    }
  }

  const fallbackPattern = rewrite.source === '/((?!api(?:/|$)).*)'
    ? /^\/(?!api(?:\/|$)).*$/
    : null
  return fallbackPattern?.test(pathname)
    ? { destination: rewrite.destination, query: { ...query } }
    : null
}

const resolveRewrite = (rewrites, pathname, query) => {
  for (const rewrite of rewrites) {
    const match = matchRewrite(rewrite, pathname, query)
    if (match) return match
  }
  return null
}

const createResponse = () => ({
  headers: {},
  statusCode: null,
  body: null,
  setHeader(name, value) {
    this.headers[name] = value
  },
  status(statusCode) {
    this.statusCode = statusCode
    return this
  },
  json(body) {
    this.body = body
    return this
  }
})

test('Vercel routes public catch-all paths to flat proxy entrypoints before the SPA fallback', async () => {
  const configuration = await loadVercelConfiguration()

  assert.equal(
    JSON.stringify(configuration).includes('BREW_DONE_IT_POLICY_ENABLED'),
    false,
    'production configuration must leave the Brew Done It policy flag unset'
  )

  assert.deepEqual(configuration.rewrites.slice(0, 2), [
    {
      source: '/api/nocodebackend/auth/:path*',
      destination: '/api/auth-proxy?path=:path*'
    },
    {
      source: '/api/nocodebackend/:path*',
      destination: '/api/data-router?path=:path*'
    }
  ])

  const authRewrite = configuration.rewrites[0]
  const dataRewrite = configuration.rewrites[1]
  const spaFallback = configuration.rewrites.at(-1)
  assert.ok(configuration.rewrites.indexOf(authRewrite) < configuration.rewrites.indexOf(dataRewrite))
  assert.ok(configuration.rewrites.indexOf(dataRewrite) < configuration.rewrites.indexOf(spaFallback))

  for (const apiPath of ['/api', '/api/', '/api/health', '/api/anything/nested']) {
    assert.equal(matchRewrite(spaFallback, apiPath), null, `${apiPath} must not reach the SPA`)
  }
})

test('Vercel wildcard captures are explicitly forwarded while unrelated query values are preserved', async () => {
  const { rewrites } = await loadVercelConfiguration()
  const cases = [
    ['/api/nocodebackend/auth/sign-up/email', '/api/auth-proxy', 'sign-up/email'],
    ['/api/nocodebackend/auth/sign-in/email', '/api/auth-proxy', 'sign-in/email'],
    ['/api/nocodebackend/auth/get-session', '/api/auth-proxy', 'get-session'],
    ['/api/nocodebackend/catalog/products', '/api/data-router', 'catalog/products'],
    ['/api/nocodebackend/catalog/products/featured/seasonal', '/api/data-router', 'catalog/products/featured/seasonal']
  ]
  const originalQuery = {
    redirectTo: 'https://pourfolio.example/profile',
    page: '3',
    q: 'lager',
    'filter[category]': 'pilsner'
  }

  for (const [pathname, destination, expectedPath] of cases) {
    const resolved = resolveRewrite(rewrites, pathname, originalQuery)
    assert.equal(resolved.destination, destination)
    assert.equal(resolved.query.path, expectedPath)
    assert.deepEqual(Object.fromEntries(
      Object.entries(resolved.query).filter(([key]) => key !== 'path')
    ), originalQuery)

    if (destination === '/api/auth-proxy') {
      assert.equal(authProxy.getRequestPath({ query: resolved.query }), expectedPath)
    } else {
      assert.deepEqual(dataRouterPathSegments({ query: resolved.query }), expectedPath.split('/'))
    }
  }
})

test('direct internal data implementation URLs are contained before file-based function routing', async () => {
  const { rewrites } = await loadVercelConfiguration()

  for (const pathname of INTERNAL_DATA_HANDLER_PATHS) {
    const resolved = resolveRewrite(rewrites, pathname, { path: 'profile', arbitrary: 'value' })
    assert.deepEqual(resolved, {
      destination: '/api/internal-not-found',
      query: { path: 'profile', arbitrary: 'value' }
    })
  }

  const response = createResponse()
  internalNotFoundHandler({ method: 'PUT', query: { path: 'profile' } }, response)
  assert.equal(response.statusCode, 404)
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.deepEqual(response.body, { error: 'Application data route not found.' })
})

test('canonical application paths remain distinct from contained implementation URLs', async () => {
  const { rewrites } = await loadVercelConfiguration()

  const profile = resolveRewrite(rewrites, '/api/nocodebackend/profile', {})
  assert.deepEqual(profile, { destination: '/api/data-router', query: { path: 'profile' } })

  const ratings = resolveRewrite(rewrites, '/api/nocodebackend/ratings/mine', {})
  assert.deepEqual(ratings, { destination: '/api/data-router', query: { path: 'ratings/mine' } })

  const brewDoneIt = resolveRewrite(rewrites, '/api/nocodebackend/brew-done-it/stats', {})
  assert.deepEqual(brewDoneIt, { destination: '/api/data-router', query: { path: 'brew-done-it/stats' } })
})

test('schema-aware data router owns launch resources and only delegates the game surface to legacy code', () => {
  assert.deepEqual(
    [...dataRouter.CURRENT_SCHEMA_RESOURCES].sort(),
    ['catalog', 'cellar', 'rating-form', 'ratings']
  )
  assert.deepEqual([...dataRouter.LEGACY_RESOURCES], ['brew-done-it'])
})

test('data router rejects unknown resources without entering the legacy data handler', async () => {
  const response = createResponse()
  await dataRouter.routeRequest({ method: 'GET', query: { path: 'profiles' } }, response)

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.body, { error: 'Application data route not found.' })
})

test('authentication proxy rejects unknown actions without contacting an upstream service', async () => {
  const response = createResponse()
  await authHandler({ method: 'POST', headers: {}, query: { path: ['unknown', 'action'] } }, response)

  assert.equal(response.statusCode, 404)
  assert.equal(response.body.error, 'Authentication action not found.')
  assert.equal(typeof response.body.requestId, 'string')
})

test('authentication proxy reports allowed methods before requiring upstream configuration', async () => {
  const response = createResponse()
  await authHandler({ method: 'GET', headers: {}, query: { path: ['sign-in', 'email'] } }, response)

  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.Allow, 'POST')
  assert.equal(response.body.error, 'Method not allowed.')
})

test('authentication proxy identifies missing server-only configuration safely', async () => {
  const previousSecret = process.env.NOCODEBACKEND_SECRET_KEY
  delete process.env.NOCODEBACKEND_SECRET_KEY
  const response = createResponse()

  try {
    await authHandler({ method: 'GET', headers: {}, query: { path: ['providers'] } }, response)
  } finally {
    if (previousSecret === undefined) delete process.env.NOCODEBACKEND_SECRET_KEY
    else process.env.NOCODEBACKEND_SECRET_KEY = previousSecret
  }

  assert.equal(response.statusCode, 503)
  assert.equal(response.body.error, 'Authentication is not configured.')
  assert.equal(response.body.code, 'auth_configuration_missing')
  assert.equal(typeof response.body.requestId, 'string')
})
