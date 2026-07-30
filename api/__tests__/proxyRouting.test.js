import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { __testables as authProxy } from '../auth-proxy.js'
import { __testables as dataProxy } from '../data-proxy.js'

const loadVercelConfiguration = async () => JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
)

test('Vercel routes public catch-all paths to flat proxy entrypoints before the SPA fallback', async () => {
  const configuration = await loadVercelConfiguration()

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
      source: '/((?!api/).*)',
      destination: '/index.html'
    }
  ])
})

test('proxy handlers consume the Vercel path capture without disturbing other query values', () => {
  const authQuery = {
    path: ['sign-in', 'google'],
    redirectTo: 'https://pourfolio.example/profile',
    state: 'provider-state'
  }
  const dataQuery = {
    path: ['catalog', 'products'],
    page: '3',
    limit: '12',
    q: 'lager',
    category: 'pilsner'
  }

  assert.equal(authProxy.getRequestPath({ query: authQuery }), 'sign-in/google')
  assert.deepEqual(authQuery, {
    path: ['sign-in', 'google'],
    redirectTo: 'https://pourfolio.example/profile',
    state: 'provider-state'
  })
  assert.deepEqual(dataProxy.pathSegments({ query: dataQuery }), ['catalog', 'products'])
  assert.deepEqual(dataQuery, {
    path: ['catalog', 'products'],
    page: '3',
    limit: '12',
    q: 'lager',
    category: 'pilsner'
  })
})
