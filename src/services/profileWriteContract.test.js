import assert from 'node:assert/strict'
import test from 'node:test'
import { projectProfileWrite } from './profileWriteContract.js'

test('profile write projection retains only deployed editable fields', () => {
  assert.deepEqual(projectProfileWrite({
    name: 'Jeremy',
    description: 'About',
    avatar_url: 'https://example.com/avatar.png',
    rating_history_public: true,
    id: 7,
    user_id: 'user-1',
    public_id: 'profile_user_1',
    secret_key: 'not-browser-writable',
    role: 'admin'
  }), {
    name: 'Jeremy',
    description: 'About',
    avatar_url: 'https://example.com/avatar.png',
    rating_history_public: true
  })
})

test('profile write projection rejects invalid or unsupported-only input', () => {
  assert.throws(() => projectProfileWrite(null), /Profile write data is invalid/u)
  assert.throws(() => projectProfileWrite([]), /Profile write data is invalid/u)
  assert.throws(() => projectProfileWrite({ user_id: 'user-1', public_id: 'profile_user_1' }), /at least one supported field/u)
})
