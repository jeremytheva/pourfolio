import assert from 'node:assert/strict'
import test from 'node:test'
import { signIn } from '../support.js'

const deployment = 'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app'
const external = 'https://external-login.example.invalid/login?private-token=never-print'

const fixture = (context, redirectAfter) => {
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
  const { page, calls } = fixture(context, 'navigation')
  await assert.rejects(signIn(page, 'synthetic-owner@example.invalid', 'synthetic-password'), rejectsOrigin)
  assert.deepEqual(calls, ['navigation'])
})

test('navigation after email entry rejects before the password field is accessed', async (context) => {
  const { page, calls } = fixture(context, 'Email')
  await assert.rejects(signIn(page, 'synthetic-owner@example.invalid', 'synthetic-password'), rejectsOrigin)
  assert.deepEqual(calls, ['navigation', 'field:Email', 'fill:Email'])
})

test('navigation after password entry rejects before any sign-in wait or submission', async (context) => {
  const { page, calls } = fixture(context, 'Password')
  await assert.rejects(signIn(page, 'synthetic-owner@example.invalid', 'synthetic-password'), rejectsOrigin)
  assert.deepEqual(calls, ['navigation', 'field:Email', 'fill:Email', 'field:Password', 'fill:Password'])
})
