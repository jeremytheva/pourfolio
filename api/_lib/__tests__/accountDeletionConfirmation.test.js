import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ACCOUNT_DELETION_CONFIRMATION_FORMAT,
  ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  ACCOUNT_DELETION_CONFIRMATION_SCHEMA_VERSION,
  validateAccountDeletionConfirmation
} from '../accountDeletionConfirmation.js'

test('accepts only the exact phrase and returns the minimal immutable result', () => {
  const input = { confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE }
  const result = validateAccountDeletionConfirmation(input)

  assert.deepEqual(result, {
    format: ACCOUNT_DELETION_CONFIRMATION_FORMAT,
    schema_version: ACCOUNT_DELETION_CONFIRMATION_SCHEMA_VERSION,
    confirmed: true
  })
  assert.equal(Object.isFrozen(result), true)
  assert.equal(JSON.stringify(result).includes(ACCOUNT_DELETION_CONFIRMATION_PHRASE), false)
  assert.deepEqual(input, { confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE })
})

test('accepts a JSON-compatible null-prototype object without coercing it', () => {
  const input = Object.create(null)
  input.confirmation = ACCOUNT_DELETION_CONFIRMATION_PHRASE

  const result = validateAccountDeletionConfirmation(input)

  assert.equal(result.confirmed, true)
  assert.equal(Object.getPrototypeOf(input), null)
  assert.equal(input.confirmation, ACCOUNT_DELETION_CONFIRMATION_PHRASE)
})

test('rejects missing, malformed and non-plain request bodies', () => {
  class RequestBody {
    constructor () {
      this.confirmation = ACCOUNT_DELETION_CONFIRMATION_PHRASE
    }
  }

  for (const input of [
    undefined,
    null,
    true,
    1,
    ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    [],
    new Date(),
    new RequestBody(),
    {},
    Object.create({ confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE })
  ]) {
    assert.throws(
      () => validateAccountDeletionConfirmation(input),
      /confirmation request is invalid/
    )
  }
})

test('rejects case, whitespace, control, invisible and Unicode lookalike variants', () => {
  for (const confirmation of [
    '',
    'delete my account',
    'Delete My Account',
    ' DELETE MY ACCOUNT',
    'DELETE MY ACCOUNT ',
    'DELETE  MY ACCOUNT',
    'DELETE\nMY ACCOUNT',
    'DELETE\tMY ACCOUNT',
    'DELETE\u00a0MY ACCOUNT',
    'DELETE MY ACCOUNT\u200b',
    'DELETE MY \u0410CCOUNT'
  ]) {
    assert.throws(
      () => validateAccountDeletionConfirmation({ confirmation }),
      /confirmation does not match/
    )
  }
})

test('rejects browser identities, record selectors, workflow values and every extra key', () => {
  for (const extra of [
    ['user_id', 'owner-1'],
    ['account_id', 'owner-1'],
    ['profile_id', 'profile-owner'],
    ['record_id', 'rating-owner'],
    ['record_ids', ['rating-owner']],
    ['job_id', 'job-private'],
    ['idempotency_key', 'private-key'],
    ['state', 'complete'],
    ['extra', true]
  ]) {
    const request = {
      confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      [extra[0]]: extra[1]
    }
    assert.throws(
      () => validateAccountDeletionConfirmation(request),
      /confirmation request is invalid/
    )
  }

  const symbolField = { confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE }
  symbolField[Symbol('private')] = 'hidden'
  assert.throws(
    () => validateAccountDeletionConfirmation(symbolField),
    /confirmation request is invalid/
  )

  const nonEnumerableField = { confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE }
  Object.defineProperty(nonEnumerableField, 'private', { value: 'hidden' })
  assert.throws(
    () => validateAccountDeletionConfirmation(nonEnumerableField),
    /confirmation request is invalid/
  )
})

test('rejects accessors and boxed or coercible values without invoking conversion hooks', () => {
  let getterCalled = false
  const accessor = {}
  Object.defineProperty(accessor, 'confirmation', {
    enumerable: true,
    get () {
      getterCalled = true
      return ACCOUNT_DELETION_CONFIRMATION_PHRASE
    }
  })
  assert.throws(
    () => validateAccountDeletionConfirmation(accessor),
    /confirmation request is invalid/
  )
  assert.equal(getterCalled, false)

  const boxed = new String(ACCOUNT_DELETION_CONFIRMATION_PHRASE)
  boxed.toString = () => {
    throw new Error('must not coerce')
  }
  assert.throws(
    () => validateAccountDeletionConfirmation({ confirmation: boxed }),
    /confirmation does not match/
  )

  let conversionCalled = false
  const coercible = {
    toString () {
      conversionCalled = true
      return ACCOUNT_DELETION_CONFIRMATION_PHRASE
    }
  }
  assert.throws(
    () => validateAccountDeletionConfirmation({ confirmation: coercible }),
    /confirmation does not match/
  )
  assert.equal(conversionCalled, false)
})

test('returns the same deterministic result and never echoes rejected private values', () => {
  const valid = Object.freeze({ confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE })
  const first = validateAccountDeletionConfirmation(valid)
  const retry = validateAccountDeletionConfirmation(valid)
  assert.strictEqual(retry, first)

  const privateValue = 'owner-private-identifier'
  assert.throws(
    () => validateAccountDeletionConfirmation({
      confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      user_id: privateValue
    }),
    (error) => !error.message.includes(privateValue) && !error.message.includes('user_id')
  )
})

test('keeps confirmation validation server-only and unreachable from executable entrypoints', async () => {
  const [source, authProxySource, dataProxySource, clientSource, appSource] = await Promise.all([
    readFile(new URL('../accountDeletionConfirmation.js', import.meta.url), 'utf8'),
    readFile(new URL('../../auth-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../data-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/lib/nocodeBackend.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/App.jsx', import.meta.url), 'utf8')
  ])

  for (const pattern of [
    /\bfetch\s*\(/, /dataProvider/, /process\.env/, /console\./,
    /\.remove\s*\(/, /compareAndSet/, /buildAccountDeletionPlan/,
    /reconcileAccountDeletionPlan/
  ]) {
    assert.doesNotMatch(source, pattern)
  }
  for (const reachableSource of [authProxySource, dataProxySource, clientSource, appSource]) {
    assert.doesNotMatch(
      reachableSource,
      /accountDeletionConfirmation|account-deletion-confirmation/
    )
  }
})