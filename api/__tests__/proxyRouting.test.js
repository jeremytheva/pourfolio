import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import authHandler, { __testables as authProxy } from '../auth-proxy.js'
import { pathSegments as dataRouterPathSegments, __testables as dataRouter } from '../data-router.js'

const INTERNAL_DATA_HANDLER_PATHS = [
  '/api/bonus-attribute-data-proxy',
  '/api/catalog-data-proxy',
  '/api/cellar-data-proxy',
  '/api/current-data-proxy',
  '/api/profile-data-proxy',
  '/api/data-proxy'
]

const loadVercelConfiguration = async () => JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
)

const matchRoute = (route, pathname, query = {}) => {
  if (!route.src) return null
  const match = pathname.match(new RegExp(`^${route.src}$`))
  if (!match) return null
  if (route.status) return { status: route.status, query: { ...query } }
  if (!route.dest) return { continue: Boolean(route.continue), query: { ...query } }
  const destination = route.dest.replace(/\$(\d+)/g, (_token, index) => match[Number(index)] || '')
  const url = new URL(destination, 'https://pourfolio.test')
  return { destination: url.pathname, query: { ...query, ...Object.fromEntries(url.searchParams.entries()) } }
}

const resolveRoute = (routes, pathname, query = {}) => {
  for (const route of routes) {
    if (route.handle === 'filesystem') return { handle: 'filesystem' }
    const matched = matchRoute(route, pathname, query)
    if (!matched) continue
    if (route.continue) continue
    return matched
  }
  return null
}

const createResponse = () => ({
  headers: {}, statusCode: null, body: null,
  setHeader(name, value) { this.headers[name] = value },
  status(statusCode) { this.statusCode = statusCode; return this },
  json(body) { this.body = body; return this }
})

test('Vercel route order contains internal containment before filesystem resolution and preserves canonical dispatch', async () => {
  const configuration = await loadVercelConfiguration()
  assert.equal(JSON.stringify(configuration).includes('BREW_DONE_IT_POLICY_ENABLED'), false)
  assert.equal(configuration.rewrites, undefined)
  assert.equal(configuration.headers, undefined)
  const [securityHeaders, assetHeaders, internalDeny, authRoute, dataRoute, filesystem, spaFallback] = configuration.routes
  assert.equal(securityHeaders.src, '/(.*)')
  assert.equal(securityHeaders.continue, true)
  assert.equal(securityHeaders.headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(assetHeaders.src, '/assets/(.*)')
  assert.equal(assetHeaders.continue, true)
  assert.equal(assetHeaders.headers['Cache-Control'], 'public, max-age=31536000, immutable')
  assert.equal(internalDeny.dest, '/api/data-router?path=__internal-not-found__')
  assert.equal(authRoute.dest, '/api/auth-proxy?path=$1')
  assert.equal(dataRoute.dest, '/api/data-router?path=$1')
  assert.deepEqual(filesystem, { handle: 'filesystem' })
  assert.equal(spaFallback.dest, '/index.html')
  assert.ok(configuration.routes.indexOf(internalDeny) < configuration.routes.indexOf(filesystem))
  assert.ok(configuration.routes.indexOf(authRoute) < configuration.routes.indexOf(filesystem))
  assert.ok(configuration.routes.indexOf(dataRoute) < configuration.routes.indexOf(filesystem))
  const spaPattern = new RegExp(`^${spaFallback.src}$`)
  for (const apiPath of ['/api', '/api/', '/api/health', '/api/anything/nested']) assert.equal(spaPattern.test(apiPath), false)
})

test('canonical route captures are explicitly forwarded while unrelated query values are preserved', async () => {
  const { routes } = await loadVercelConfiguration()
  const cases = [
    ['/api/nocodebackend/auth/sign-up/email', '/api/auth-proxy', 'sign-up/email'],
    ['/api/nocodebackend/auth/sign-in/email', '/api/auth-proxy', 'sign-in/email'],
    ['/api/nocodebackend/auth/get-session', '/api/auth-proxy', 'get-session'],
    ['/api/nocodebackend/catalog/products', '/api/data-router', 'catalog/products'],
    ['/api/nocodebackend/catalog/products/featured/seasonal', '/api/data-router', 'catalog/products/featured/seasonal']
  ]
  const originalQuery = { redirectTo: 'https://pourfolio.example/profile', page: '3', q: 'lager', 'filter[category]': 'pilsner' }
  for (const [pathname, destination, expectedPath] of cases) {
    const resolved = resolveRoute(routes, pathname, originalQuery)
    assert.equal(resolved.destination, destination)
    assert.equal(resolved.query.path, expectedPath)
    assert.deepEqual(Object.fromEntries(Object.entries(resolved.query).filter(([key]) => key !== 'path')), originalQuery)
    if (destination === '/api/auth-proxy') assert.equal(authProxy.getRequestPath({ query: resolved.query }), expectedPath)
    else assert.deepEqual(dataRouterPathSegments({ query: resolved.query }), expectedPath.split('/'))
  }
})

test('direct internal data implementation URLs route through the consolidated inert data-router path', async () => {
  const { routes } = await loadVercelConfiguration()
  for (const pathname of INTERNAL_DATA_HANDLER_PATHS) {
    for (const candidate of [pathname, `${pathname}.js`, `${pathname}/`]) {
      const resolved = resolveRoute(routes, candidate, {})
      assert.equal(resolved.destination, '/api/data-router')
      assert.equal(resolved.query.path, '__internal-not-found__')
    }
  }
  const response = createResponse()
  await dataRouter.routeRequest({ method: 'PUT', query: { path: '__internal-not-found__' } }, response)
  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.body, { error: 'Application data route not found.' })
})

test('canonical application paths remain distinct from contained implementation URLs', async () => {
  const { routes } = await loadVercelConfiguration()
  assert.deepEqual(resolveRoute(routes, '/api/nocodebackend/profile', {}), { destination: '/api/data-router', query: { path: 'profile' } })
  assert.deepEqual(resolveRoute(routes, '/api/nocodebackend/profiles/profile_abcdefgh1234', {}), { destination: '/api/data-router', query: { path: 'profiles/profile_abcdefgh1234' } })
  assert.deepEqual(resolveRoute(routes, '/api/nocodebackend/ratings/mine', {}), { destination: '/api/data-router', query: { path: 'ratings/mine' } })
  assert.deepEqual(resolveRoute(routes, '/api/nocodebackend/brew-done-it/stats', {}), { destination: '/api/data-router', query: { path: 'brew-done-it/stats' } })
})

test('schema-aware data router owns launch resources and only delegates the game surface to legacy code', () => {
  assert.deepEqual([...dataRouter.CURRENT_SCHEMA_RESOURCES].sort(), ['bonus-attributes', 'catalog', 'cellar', 'rating-form', 'ratings'])
  assert.deepEqual([...dataRouter.LEGACY_RESOURCES], ['brew-done-it'])
})

test('data router rejects unknown resources without entering the legacy data handler', async () => {
  const response = createResponse()
  await dataRouter.routeRequest({ method: 'GET', query: { path: 'unrecognised-resource' } }, response)
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
  try { await authHandler({ method: 'GET', headers: {}, query: { path: ['providers'] } }, response) }
  finally {
    if (previousSecret === undefined) delete process.env.NOCODEBACKEND_SECRET_KEY
    else process.env.NOCODEBACKEND_SECRET_KEY = previousSecret
  }
  assert.equal(response.statusCode, 503)
  assert.equal(response.body.error, 'Authentication is not configured.')
  assert.equal(response.body.code, 'auth_configuration_missing')
  assert.equal(typeof response.body.requestId, 'string')
})
