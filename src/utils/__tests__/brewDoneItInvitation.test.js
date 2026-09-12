import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatBrewDoneItInvitation,
  isBrewDoneItInvitationExpired,
  parseBrewDoneItInvitation
} from '../brewDoneItInvitation.js'

const code = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345'

test('shared Brew invitation text round-trips without a URL credential', () => {
  const text = formatBrewDoneItInvitation('42', code)
  assert.equal(text, `Join my Brew Done It challenge in Pourfolio. Game 42. Challenge code: ${code}`)
  assert.deepEqual(parseBrewDoneItInvitation(text), { gameId: '42', inviteCode: code })
  assert.equal(text.includes('http'), false)
})

test('compact displayed challenge details can also be pasted', () => {
  assert.deepEqual(parseBrewDoneItInvitation(`Game 42: ${code}`), { gameId: '42', inviteCode: code })
})

test('pasted whitespace is normalized but arbitrary text and malformed credentials are rejected', () => {
  assert.deepEqual(
    parseBrewDoneItInvitation(`  Join my Brew Done It challenge in Pourfolio.\nGame 42. Challenge code: ${code}  `),
    { gameId: '42', inviteCode: code }
  )
  assert.equal(parseBrewDoneItInvitation('Game 0: invalid'), null)
  assert.equal(parseBrewDoneItInvitation('https://example.test/challenge?code=secret'), null)
  assert.equal(formatBrewDoneItInvitation('0', code), '')
})

test('invitation expiry uses the persisted timestamp without treating invalid data as expired', () => {
  const now = Date.parse('2026-09-12T02:00:00.000Z')
  assert.equal(isBrewDoneItInvitationExpired('2026-09-12T01:59:59.000Z', now), true)
  assert.equal(isBrewDoneItInvitationExpired('2026-09-12T02:00:00.000Z', now), true)
  assert.equal(isBrewDoneItInvitationExpired('2026-09-12T02:00:01.000Z', now), false)
  assert.equal(isBrewDoneItInvitationExpired('not-a-date', now), false)
})
