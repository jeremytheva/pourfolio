import assert from 'node:assert/strict'
import test from 'node:test'
import { __testables } from '../brewDoneItEntryV3.js'

const { routeKind, brewDoneItBackendEnabled } = __testables
const route = (method, path) => routeKind({ method, query: { path } })

test('v3 owns challenge creation join and next-round mutations', () => {
  assert.deepEqual(route('POST', ['brew-done-it', 'games']), { kind: 'game-create' })
  assert.deepEqual(route('POST', ['brew-done-it', 'games', '12', 'join']), { kind: 'game-join', id: '12' })
  assert.deepEqual(route('POST', ['brew-done-it', 'games', '12', 'rounds']), { kind: 'round-create', id: '12' })
})

test('v3 still owns deduction routes and leaves unrelated legacy game actions to fallback', () => {
  assert.deepEqual(route('POST', ['brew-done-it', 'rounds', '8', 'deductions']), { kind: 'deduction-save', id: '8' })
  assert.deepEqual(route('POST', ['brew-done-it', 'rounds', '8', 'guesses']), { kind: 'superseded' })
  assert.equal(route('POST', ['brew-done-it', 'games', '12', 'archive']), null)
})

test('Brew backend is enabled by default for testing and supports an explicit false kill switch', () => {
  assert.equal(brewDoneItBackendEnabled({}), true)
  assert.equal(brewDoneItBackendEnabled({ NODE_ENV: 'development' }), true)
  assert.equal(brewDoneItBackendEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), true)
  assert.equal(brewDoneItBackendEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'production' }), true)
  assert.equal(brewDoneItBackendEnabled({ BREW_DONE_IT_POLICY_ENABLED: 'true' }), true)
  assert.equal(brewDoneItBackendEnabled({ BREW_DONE_IT_POLICY_ENABLED: 'false' }), false)
  assert.equal(brewDoneItBackendEnabled({ BREW_DONE_IT_POLICY_ENABLED: ' FALSE ' }), false)
})
