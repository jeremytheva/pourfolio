import assert from 'node:assert/strict'
import test from 'node:test'

import { runWithDataRequestContext, getDataRequestContext, __testables } from '../dataRequestContext.js'

test('only Better Auth session cookies are forwarded to the data provider', () => {
  const cookie = __testables.extractAuthCookies(
    'theme=dark; better-auth.session_token=abc; analytics=123; __Secure-better-auth.session_data=xyz'
  )
  assert.equal(cookie, 'better-auth.session_token=abc; __Secure-better-auth.session_data=xyz')
})

test('request-scoped context preserves auth cookie and stable origin without cross-request globals', async () => {
  const request = {
    headers: {
      cookie: 'better-auth.session_token=session-one; unrelated=value',
      origin: 'https://pourfolio.example.test'
    }
  }

  await runWithDataRequestContext(request, async () => {
    assert.deepEqual(getDataRequestContext(), {
      cookie: 'better-auth.session_token=session-one',
      origin: 'https://pourfolio.example.test',
      referer: 'https://pourfolio.example.test/'
    })
    await Promise.resolve()
    assert.equal(getDataRequestContext().cookie, 'better-auth.session_token=session-one')
  })

  assert.deepEqual(getDataRequestContext(), {})
})

test('host and forwarded protocol provide a safe origin fallback', () => {
  assert.equal(__testables.requestOrigin({
    headers: {
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'pourfolio.vercel.app'
    }
  }), 'https://pourfolio.vercel.app')
})
