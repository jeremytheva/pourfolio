import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

const purpose = Buffer.from('pourfolio-bonus-fixture-receipt-v1')
const keyFor = (secret, salt) => {
  if (typeof secret !== 'string' || !secret.trim()) throw new Error('BONUS_RECEIPT_KEY_MISSING')
  return hkdfSync('sha256', Buffer.from(secret), salt, purpose, 32)
}

// Retain recovery identity without publishing account IDs or random labels.
// Only the existing protected data credential can open the receipt.
export const sealBonusFixtureReceipt = (payload, secret) => {
  const salt = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFor(secret, salt), iv)
  cipher.setAAD(purpose)
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return { version: 1, salt: salt.toString('base64'), iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
}

export const openBonusFixtureReceipt = (receipt, secret) => {
  try {
    if (receipt?.version !== 1) throw new Error('version')
    const salt = Buffer.from(receipt.salt, 'base64')
    const iv = Buffer.from(receipt.iv, 'base64')
    const tag = Buffer.from(receipt.tag, 'base64')
    if (salt.length !== 32 || iv.length !== 12 || tag.length !== 16) throw new Error('shape')
    const decipher = createDecipheriv('aes-256-gcm', keyFor(secret, salt), iv)
    decipher.setAAD(purpose)
    decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(receipt.data, 'base64')), decipher.final()]).toString('utf8'))
  } catch {
    throw Object.assign(new Error('BONUS_RECEIPT_UNCONFIRMED'), { code: 'BONUS_RECEIPT_UNCONFIRMED' })
  }
}
