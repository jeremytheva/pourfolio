import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import authHandler, { __testables as authProxy } from '../auth-proxy.js'
import { pathSegments as dataRouterPathSegments, __testables as dataRouter } from '../data-router.js'

const loadVercelConfiguration = async () => JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
)

const matchRewrite = (rewrite, pathname, query = {}) => {
  const wildcardMarker = '/:path*'
  if (rewrite.source.endsWith(wildcardMarker)) {
    const prefix = rewrite.source.slice(0, -wildcardMarker.length)
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const capture = pathname.slice(prefix.length).replace(/^\//, '')
      return {
        destination: rewrite.destination,
        query: { ...query, path: capture ? capture.split('/') : [] }
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

  assert.deepEqual(configuration.rewrites.slice(0, 3), [
    {
      source: '/api/nocodebackend/auth/:path*',
      destination: '/api/auth-proxy'
    },
    {
      source: '/api/nocodebackend/:path*',
      destination: '/api/data-router'
    },
    {
      source: '/((?!api(?:/|$)).*)',
      destination: '/index.html'
    }
  ])

  const [authRewrite, dataRewrite, spaFallback] = configuration.rewrites
  assert.ok(configuration.rewrites.indexOf(authRewrite) < configuration.rewrites.indexOf(dataRewrite))
  assert.ok(configuration.rewrites.indexOf(dataRewrite) < configuration.rewrites.indexOf(spaFallback))

  for (const apiPath of ['/api', '/api/', '/api/health', '/api/anything/nested']) {
    assert.equal(matchRewrite(spaFallback, apiPath), null, `${apiPath} must not reach the SPA`)
  }
})

test('Vercel Git deployments stay disabled for normal implementation branches', async () => {
  const configuration = await loadVercelConfiguration()

  assert.deepEqual(configuration.git?.deploymentEnabled, {
    'codex/**': false,
    'chore/**': false,
    'docs/**': false,
    'fix/**': false,
    'feature/**': false,
    'phase-*/**': false,
    'observability/**': false,
    'dependabot/**': false
  })

  assert.equal(
    Object.hasOwn(configuration.git.deploymentEnabled, 'main'),
    false,
    'main must remain eligible for the governed production deployment path'
  )
  assert.equal(
    Object.keys(configuration.git.deploymentEnabled).some((pattern) => pattern.startsWith('preview/')),
    false,
    'preview/* branches must remain eligible for deliberate exact-SHA connected evidence'
  )
})

test('Vercel wildcard captures preserve every path segment and unrelated query values', async () => {
  const { rewrites } = await loadVercelConfiguration()
  const cases = [
    ['/api/nocodebackend/auth/sign-up/email', '/api/auth-proxy', ['sign-up', 'email']],
    ['/api/nocodebackend/auth/sign-in/email', '/api/auth-proxy', ['sign-in', 'email']],
    ['/api/nocodebackend/auth/get-session', '/api/auth-proxy', ['get-session']],
    ['/api/nocodebackend/catalog/products', '/api/data-router', ['catalog', 'products']],
    ['/api/nocodebackend/catalog/products/featured/seasonal', '/api/data-router', ['catalog', 'products', 'featured', 'seasonal']]
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
    assert.deepEqual(resolved.query.path, expectedPath)
    assert.deepEqual(Object.fromEntries(
      Object.entries(resolved.query).filter(([key]) => key !== 'path')
    ), originalQuery)

    if (destination === '/api/auth-proxy') {
      assert.equal(authProxy.getRequestPath({ query: resolved.query }), expectedPath.join('/'))
    } else {
      assert.deepEqual(dataRouterPathSegments({ query: resolved.query }), expectedPath)
    }
  }
})

test('schema-aware data router owns only database-aligned launch resources', () => {
  assert.deepEqual(
    [...dataRouter.CURRENT_SCHEMA_RESOURCES].sort(),
    ['catalog', 'cellar', 'rating-form', 'ratings']
  )
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