const INVITATION_CODE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/u
const POSITIVE_ID_PATTERN = /^[1-9]\d*$/u
const SHARED_TEXT_PATTERN = /^Join my Brew Done It challenge in Pourfolio\. Game ([1-9]\d*)\. Challenge code: ([A-Za-z0-9_-]{32,128})$/u
const COMPACT_TEXT_PATTERN = /^Game ([1-9]\d*): ([A-Za-z0-9_-]{32,128})$/u

const normaliseText = (value) => String(value ?? '').trim().replace(/\s+/gu, ' ')

export const formatBrewDoneItInvitation = (gameId, inviteCode) => {
  const game = String(gameId ?? '').trim()
  const code = String(inviteCode ?? '').trim()
  if (!POSITIVE_ID_PATTERN.test(game) || !INVITATION_CODE_PATTERN.test(code)) return ''
  return `Join my Brew Done It challenge in Pourfolio. Game ${game}. Challenge code: ${code}`
}

export const parseBrewDoneItInvitation = (value) => {
  const text = normaliseText(value)
  const match = text.match(SHARED_TEXT_PATTERN) || text.match(COMPACT_TEXT_PATTERN)
  if (!match) return null
  return { gameId: match[1], inviteCode: match[2] }
}

export const isBrewDoneItInvitationExpired = (expiresAt, now = Date.now()) => {
  const expiry = Date.parse(expiresAt || '')
  return Number.isFinite(expiry) && Number.isFinite(Number(now)) ? expiry <= Number(now) : false
}

export const __testables = { normaliseText, INVITATION_CODE_PATTERN, POSITIVE_ID_PATTERN }
