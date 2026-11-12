import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createReleaseSessionScope, signIn } from '../support.js'

const origin = 'https://brew-buds-mobile-app-design-3577.vercel.app'
const privateCanary = 'private-cookie-password-url-canary'
const cookie = (value = privateCanary) => ({ name: 'session', value,
  domain: new URL(origin).hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax', expires: -1 })

const fixture = (t, outcomes = []) => {
  const names = ['RELEASE_BASE_URL', 'RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_SESSION_PATH']
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]))
  process.env.RELEASE_BASE_URL = origin
  process.env.RELEASE_OWNER_EMAIL = 'owner@example.invalid'
  delete process.env.RELEASE_OWNER_SESSION_PATH
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })
  const calls = []
  const contexts = []
  const newContext = async (options) => {
    const number = contexts.length
    const item = { options, disposed: false }
    contexts.push(item)
    return {
      post: async (url, init) => {
        calls.push({ number, method: 'POST', url, init, cookies: structuredClone(options.storageState.cookies) })
        // A real sign-out can overwrite cookies in its own jar. The probe must
        // nevertheless receive the immutable originals in a separate context.
        options.storageState.cookies[0].value = 'cleared-after-signout'
        if (outcomes[number] === 'throw') throw new Error(privateCanary)
        return { status: () => outcomes[number] ?? 200 }
      },
      get: async (url, init) => {
        calls.push({ number, method: 'GET', url, init, cookies: structuredClone(options.storageState.cookies) })
        if (outcomes[number] === 'throw') throw new Error(privateCanary)
        return { status: () => outcomes[number] ?? 401 }
      },
      dispose: async () => { item.disposed = true }
    }
  }
  const page = (cookies = [cookie()]) => {
    let current = cookies
    const context = { cookies: async () => structuredClone(current) }
    return { context: () => context, setCookies: value => { current = value },
      url: () => origin + '/login' }
  }
  return { scope: createReleaseSessionScope({ newContext }), calls, contexts, page }
}

const unconfirmed = (error) => error.message === 'Release session cleanup is unconfirmed.' &&
  !JSON.stringify(error, Object.getOwnPropertyNames(error)).includes(privateCanary) &&
  !Object.hasOwn(error, 'cause')

test('cleanup retains original cookies, independently signs out and requires original-cookie HTTP401', async (t) => {
  const { scope, calls, contexts, page } = fixture(t)
  const ownerPage = page([cookie(), { ...cookie('off-origin'), domain: 'elsewhere.invalid' }])
  scope.track(ownerPage, 'owner@example.invalid')
  scope.beginAuthentication(ownerPage)
  await scope.capture(ownerPage)
  await scope.cleanup()
  assert.deepEqual(calls.map(call => [call.method, call.url]), [
    ['POST', origin + '/api/nocodebackend/auth/sign-out'],
    ['GET', origin + '/api/nocodebackend/auth/get-session']
  ])
  assert.equal(contexts.length, 2)
  assert.equal(contexts.every(context => context.disposed), true)
  for (const call of calls) {
    assert.deepEqual(call.cookies, [cookie()])
    assert.equal(call.init.maxRedirects, 0)
    assert.equal(call.init.maxRetries, 0)
    assert.equal(call.init.timeout, 4000)
    assert.equal(call.init.headers.Origin, origin)
  }
  assert.deepEqual(calls[0].init.data, {})
})

test('cleanup captures a session after a partial sign-in failure and captures later cookie rotation', async (t) => {
  const { scope, calls, page } = fixture(t)
  const ownerPage = page([])
  scope.track(ownerPage, 'owner@example.invalid')
  scope.beginAuthentication(ownerPage)
  // Authentication issued the cookie before navigation/assertion failed.
  ownerPage.setCookies([cookie('issued-before-failure')])
  await scope.capture(ownerPage)
  ownerPage.setCookies([cookie('rotated-before-teardown')])
  await scope.cleanup()
  assert.deepEqual(calls.filter(call => call.method === 'GET').map(call => call.cookies[0].value),
    ['issued-before-failure', 'rotated-before-teardown'])
})

test('sign-in tracks before authentication and retains cookies when submission navigation fails', async (t) => {
  const { scope, calls, page } = fixture(t)
  const ownerPage = page([])
  const primary = new Error('controlled post-authentication failure')
  ownerPage.goto = async () => {}
  ownerPage.getByLabel = () => ({ fill: async () => {} })
  ownerPage.waitForResponse = async () => ({ status: () => 200 })
  ownerPage.getByRole = () => ({ click: async () => {
    ownerPage.setCookies([cookie('issued-before-submission-failure')])
    throw primary
  } })
  await assert.rejects(signIn(ownerPage, 'owner@example.invalid', privateCanary, { sessionScope: scope }),
    error => error === primary)
  await scope.cleanup()
  assert.equal(calls.length, 2)
  assert.equal(calls[1].cookies[0].value, 'issued-before-submission-failure')
})

test('every session and probe is attempted after another sign-out or probe fails', async (t) => {
  const { scope, calls, contexts, page } = fixture(t, ['throw', 200, 200, 401])
  const ownerPage = page()
  const otherPage = page([cookie('other-cookie')])
  scope.track(ownerPage, 'owner@example.invalid')
  scope.track(otherPage, 'other@example.invalid')
  await assert.rejects(scope.cleanup(), unconfirmed)
  assert.deepEqual(calls.map(call => call.method), ['POST', 'GET', 'POST', 'GET'])
  assert.equal(contexts.every(context => context.disposed), true)
})

for (const status of [200, 302, 403, 500, 'throw']) {
  test(`original-cookie probe outcome ${status} cannot certify revocation`, async (t) => {
    const { scope, page } = fixture(t, [200, status])
    scope.track(page(), 'owner@example.invalid')
    await assert.rejects(scope.cleanup(), unconfirmed)
  })
}

test('a sign-out redirect fails even when the separate original-cookie probe returns401', async (t) => {
  const { scope, calls, page } = fixture(t, [302, 401])
  scope.track(page(), 'owner@example.invalid')
  await assert.rejects(scope.cleanup(), unconfirmed)
  assert.equal(calls.length, 2)
})

test('empty pre-authentication scope is harmless but attempted authentication without retained cookies is unconfirmed', async (t) => {
  const { scope, calls, page } = fixture(t)
  const ownerPage = page([])
  scope.track(ownerPage, 'owner@example.invalid')
  scope.beginAuthentication(ownerPage)
  await assert.rejects(scope.cleanup(), unconfirmed)
  assert.equal(calls.length, 0)
  const unused = createReleaseSessionScope({ newContext: async () => { throw new Error('must not request') } })
  await unused.cleanup()
})

test('cookie capture failure is retained while another account still receives both cleanup requests', async (t) => {
  const { scope, calls, page } = fixture(t)
  const broken = { context: () => brokenContext }
  const brokenContext = { cookies: async () => { throw new Error(privateCanary) } }
  scope.track(broken, 'owner@example.invalid')
  scope.track(page(), 'other@example.invalid')
  await assert.rejects(scope.capture(broken), unconfirmed)
  await assert.rejects(scope.cleanup(), unconfirmed)
  assert.equal(calls.length, 2)
})

test('snapshot and account limits fail closed while retained credentials are still revoked', async (t) => {
  const { scope, calls, page } = fixture(t)
  const ownerPage = page()
  scope.track(ownerPage, 'owner@example.invalid')
  for (let index = 0; index < 5; index += 1) {
    ownerPage.setCookies([cookie('snapshot-' + index)])
    await scope.capture(ownerPage)
  }
  ownerPage.setCookies([cookie('unexpected-sixth-snapshot')])
  await assert.rejects(scope.capture(ownerPage), unconfirmed)
  scope.track(page(), 'other@example.invalid')
  assert.throws(() => scope.track(page(), 'third@example.invalid'), unconfirmed)
  await assert.rejects(scope.cleanup(), unconfirmed)
  assert.equal(calls.length, 14)
  assert.equal(calls.some(call => call.method === 'GET' &&
    call.cookies[0].value === 'unexpected-sixth-snapshot'), true)
})

for (const redirectAfter of ['navigation', 'Email', 'Password']) {
  test(`sign-in refuses an unexpected origin after ${redirectAfter} without exposing its URL`, async (t) => {
    const { scope, page } = fixture(t)
    const ownerPage = page([])
    const calls = []
    let location = 'about:blank'
    ownerPage.url = () => location
    ownerPage.goto = async () => {
      calls.push('navigation')
      location = redirectAfter === 'navigation' ? 'https://elsewhere.invalid/' + privateCanary : origin + '/login'
    }
    ownerPage.getByLabel = (label) => ({ fill: async () => {
      calls.push(label)
      if (redirectAfter === label) location = 'https://elsewhere.invalid/' + privateCanary
    } })
    ownerPage.waitForResponse = () => { throw new Error('Unexpected authentication submission') }
    await assert.rejects(signIn(ownerPage, 'owner@example.invalid', privateCanary, { sessionScope: scope }),
      error => error.message === 'Release page origin is unverified.' && !error.message.includes(privateCanary))
    assert.equal(calls.includes('Password'), redirectAfter === 'Password')
    await scope.cleanup()
  })
}

const deployment = 'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app'
const external = 'https://external-login.example.invalid/login?private-token=never-print'

const originCheckpointFixture = (context, redirectAfter) => {
  const previous = process.env.RELEASE_BASE_URL
  process.env.RELEASE_BASE_URL = deployment
  context.after(() => {
    if (previous === undefined) delete process.env.RELEASE_BASE_URL
    else process.env.RELEASE_BASE_URL = previous
  })
  let currentUrl = 'about:blank'
  const calls = []
  const page = {
    url: () => currentUrl,
    async goto() {
      calls.push('navigation')
      currentUrl = redirectAfter === 'navigation' ? external : deployment + '/login'
    },
    getByLabel(label) {
      calls.push('field:' + label)
      return { async fill() {
        calls.push('fill:' + label)
        if (redirectAfter === label) currentUrl = external
      } }
    },
    waitForResponse() {
      calls.push('response-wait')
      throw new Error('Unexpected sign-in submission.')
    },
    getByRole() {
      calls.push('submit-control')
      throw new Error('Unexpected sign-in submission.')
    }
  }
  return { page, calls }
}

const rejectsOrigin = (error) => error.message === 'Release page origin is unverified.' &&
  !error.message.includes('private-token') && !error.message.includes('external-login')

test('external login redirect rejects before either account field is accessed', async (context) => {
  const { page, calls } = originCheckpointFixture(context, 'navigation')
  await assert.rejects(signIn(page, 'synthetic-owner@example.invalid', 'synthetic-password'), rejectsOrigin)
  assert.deepEqual(calls, ['navigation'])
})

test('navigation after email entry rejects before the password field is accessed', async (context) => {
  const { page, calls } = originCheckpointFixture(context, 'Email')
  await assert.rejects(signIn(page, 'synthetic-owner@example.invalid', 'synthetic-password'), rejectsOrigin)
  assert.deepEqual(calls, ['navigation', 'field:Email', 'fill:Email'])
})

test('navigation after password entry rejects before any sign-in wait or submission', async (context) => {
  const { page, calls } = originCheckpointFixture(context, 'Password')
  await assert.rejects(signIn(page, 'synthetic-owner@example.invalid', 'synthetic-password'), rejectsOrigin)
  assert.deepEqual(calls, ['navigation', 'field:Email', 'fill:Email', 'field:Password', 'fill:Password'])
})
