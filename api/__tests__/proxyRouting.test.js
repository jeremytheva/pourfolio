import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import authHandler, { __testables as authProxy } from '../auth-proxy.js'
import { __testables as dataProxy } from '../data-proxy.js'

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
      destination: '/api/data-proxy'
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

test('Vercel wildcard captures preserve every path segment and unrelated query values', async () => {
  const { rewrites } = await loadVercelConfiguration()
  const cases = [
    ['/api/nocodebackend/auth/sign-up/email', '/api/auth-proxy', ['sign-up', 'email']],
    ['/api/nocodebackend/auth/sign-in/email', '/api/auth-proxy', ['sign-in', 'email']],
    ['/api/nocodebackend/auth/get-session', '/api/auth-proxy', ['get-session']],
    ['/api/nocodebackend/catalog/products', '/api/data-proxy', ['catalog', 'products']],
    ['/api/nocodebackend/catalog/products/featured/seasonal', '/api/data-proxy', ['catalog', 'products', 'featured', 'seasonal']]
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
      assert.deepEqual(dataProxy.pathSegments({ query: resolved.query }), expectedPath)
    }
  }
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
