import crypto from 'node:crypto'
import fs from 'node:fs'
import { normalizeAuthUser } from '../src/hooks/useAuth.js'

const ownerEmail = () => String(process.env.RELEASE_OWNER_EMAIL || '').trim().toLowerCase()
const binding = () => ({
  sha: process.env.RELEASE_SHA,
  origin: new URL(process.env.RELEASE_BASE_URL).origin,
  owner: crypto.createHash('sha256').update(ownerEmail()).digest('hex')
})

export const saveReleaseOwnerSession = (storageState, email) => {
  const filePath = process.env.RELEASE_OWNER_SESSION_PATH
  if (!filePath || String(email).trim().toLowerCase() !== ownerEmail()) return
  const metadata = binding()
  const hostname = new URL(metadata.origin).hostname
  const cookies = storageState.cookies.filter((cookie) => cookie.domain.replace(/^\./, '') === hostname)
  const descriptor = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o600)
  try {
    fs.fchmodSync(descriptor, 0o600)
    fs.writeFileSync(descriptor, JSON.stringify({ ...metadata, cookies }))
  } finally {
    fs.closeSync(descriptor)
  }
}

export const restoreReleaseOwnerSession = async (page, email) => {
  const filePath = process.env.RELEASE_OWNER_SESSION_PATH
  if (!filePath || String(email).trim().toLowerCase() !== ownerEmail() || !fs.existsSync(filePath)) return false
  if ((fs.statSync(filePath).mode & 0o077) !== 0) throw new Error('The release owner session file must be private.')
  let saved
  try { saved = JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  catch { throw new Error('The release owner session file is invalid.') }
  const expected = binding()
  if (!saved || saved.sha !== expected.sha || saved.origin !== expected.origin || saved.owner !== expected.owner) return false
  const hostname = new URL(expected.origin).hostname
  if (!Array.isArray(saved.cookies) || !saved.cookies.length || saved.cookies.some((cookie) =>
    !cookie || typeof cookie.domain !== 'string' || cookie.domain.replace(/^\./, '') !== hostname)) return false
  await page.context().addCookies(saved.cookies)
  const response = await page.request.get('/api/nocodebackend/auth/get-session')
  if (response.status() === 401) {
    await page.context().clearCookies()
    return false
  }
  if (response.status() !== 200) throw new Error('The saved release owner session could not be verified.')
  const user = normalizeAuthUser(await response.json())
  if (!user || String(user.email || '').trim().toLowerCase() !== ownerEmail()) {
    await page.context().clearCookies()
    return false
  }
  await page.goto('/home')
  return true
}
