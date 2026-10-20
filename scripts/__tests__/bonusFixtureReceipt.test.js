import assert from 'node:assert/strict'
import test from 'node:test'
import { openBonusFixtureReceipt, sealBonusFixtureReceipt } from '../bonus-fixture-receipt.js'

const secret = 'protected-provider-key-for-test-only'
const payload = { userId: 'private-owner', attributeId: 123, mappingId: 456,
  description: 'private-random-nonce', sourceRun: 'controlled-run' }

test('recovery receipt round trips with only the protected key and exposes no identities', () => {
  const receipt = sealBonusFixtureReceipt(payload, secret)
  assert.deepEqual(openBonusFixtureReceipt(receipt, secret), payload)
  const text = JSON.stringify(receipt)
  for (const value of [secret, payload.userId, payload.description, payload.sourceRun]) assert.equal(text.includes(value), false)
  assert.notEqual(sealBonusFixtureReceipt(payload, secret).data, receipt.data)
})

for (const field of ['data', 'tag', 'iv', 'salt']) {
  test(`a modified receipt ${field} cannot authorise recovery`, () => {
    const receipt = sealBonusFixtureReceipt(payload, secret)
    const changed = Buffer.from(receipt[field], 'base64')
    changed[0] ^= 1
    receipt[field] = changed.toString('base64')
    assert.throws(() => openBonusFixtureReceipt(receipt, secret), { code: 'BONUS_RECEIPT_UNCONFIRMED' })
  })
}

test('wrong or absent key cannot open a receipt and errors disclose no identity', () => {
  const receipt = sealBonusFixtureReceipt(payload, secret)
  for (const key of ['', 'other-key']) assert.throws(() => openBonusFixtureReceipt(receipt, key), {
    code: 'BONUS_RECEIPT_UNCONFIRMED', message: 'BONUS_RECEIPT_UNCONFIRMED'
  })
  assert.throws(() => sealBonusFixtureReceipt(payload, ''), /BONUS_RECEIPT_KEY_MISSING/)
})
