import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSignUpPayload } from './useAuth.js'

test('NoCodeBackend email signup uses only the documented name, email and password fields', () => {
  const payload = buildSignUpPayload('person@example.com', 'secret-password', {
    name: '  Example User  ',
    metadata: { role: 'should-not-forward' },
    user_id: 'should-not-forward'
  })

  assert.deepEqual(payload, {
    name: 'Example User',
    email: 'person@example.com',
    password: 'secret-password'
  })
  assert.deepEqual(Object.keys(payload).sort(), ['email', 'name', 'password'])
})
