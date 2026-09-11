import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'
import { isOwnedBy } from './dataPolicy.js'

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
const EDITABLE_FIELDS = new Set(['name', 'description', 'avatar_url', 'rating_history_public'])
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)
const fail = (message, status = 400, code) => Object.assign(new Error(message), { status, code })
const providerFailure = () => fail('The profile service returned invalid data.', 502, 'PROFILE_PROVIDER_INVALID')
const text = (value, max, fallback = '') => value === undefined || value === null ? fallback : String(value).trim().slice(0, max)
export const profileHistoryIsPublic = (value) => value === true || value === 1 || value === '1'

export const parsePublicProfileId = (value) => {
  const id = String(value ?? '').trim()
  if (!PUBLIC_ID_PATTERN.test(id)) throw fail('Profile identifier is invalid.', 400, 'invalid_profile_identifier')
  return id
}

const avatar = (value) => {
  const raw = text(value, 2048)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return ['https:', 'http:'].includes(url.protocol) ? raw : null
  } catch {
    return null
  }
}

const validRecord = (record) => Boolean(
  record?.id !== undefined && record?.id !== null &&
  String(record?.user_id ?? '').trim() &&
  PUBLIC_ID_PATTERN.test(String(record?.public_id ?? '').trim()) &&
  text(record?.name, 120)
)

export const projectOwnerProfile = (record) => {
  if (!validRecord(record)) throw providerFailure()
  return {
    public_id: String(record.public_id),
    name: text(record.name, 120),
    description: text(record.description, 1000),
    avatar_url: avatar(record.avatar_url),
    rating_history_public: profileHistoryIsPublic(record.rating_history_public)
  }
}

export const projectPublicProfile = (record) => {
  const owner = projectOwnerProfile(record)
  return {
    public_id: owner.public_id,
    name: owner.name,
    description: owner.description,
    avatar_url: owner.avatar_url
  }
}

export const findOwnedProfile = async (userId) => {
  const owned = list(await dataProvider.list(COLLECTIONS.profiles, { user_id: userId }))
    .filter((record) => isOwnedBy(record, userId))
  if (owned.length > 1) throw providerFailure()
  return owned[0] || null
}

export const findPublicProfile = async (publicId) => {
  const matches = list(await dataProvider.list(COLLECTIONS.profiles, { public_id: publicId }))
    .filter((record) => String(record.public_id ?? '') === publicId)
  if (matches.length > 1) throw providerFailure()
  return matches[0] || null
}

const defaultName = (user) => text(user?.name, 120) || 'Pourfolio user'

export const createOwnerProfile = async (user) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const body = {
      user_id: user.id,
      public_id: crypto.randomUUID(),
      name: defaultName(user),
      rating_history_public: 0
    }
    try {
      const created = first(await dataProvider.create(COLLECTIONS.profiles, body))
      const saved = created ? { ...body, ...created } : await findOwnedProfile(user.id)
      if (!saved || !isOwnedBy(saved, user.id) || String(saved.public_id) !== body.public_id) throw providerFailure()
      projectOwnerProfile(saved)
      return saved
    } catch (error) {
      if (!dataProvider.isUniqueConflict(error)) throw error
      const existing = await findOwnedProfile(user.id)
      if (existing) return existing
    }
  }
  throw providerFailure()
}

export const ensureOwnerProfile = async (user) => (await findOwnedProfile(user.id)) || createOwnerProfile(user)

export const sanitiseProfileUpdates = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('Profile data is invalid.')
  const updates = {}
  for (const [field, value] of Object.entries(input)) {
    if (!EDITABLE_FIELDS.has(field)) continue
    if (field === 'name') {
      const name = text(value, 120)
      if (!name) throw fail('Profile name is required.')
      updates.name = name
    } else if (field === 'description') {
      updates.description = text(value, 1000)
    } else if (field === 'avatar_url') {
      if (value === null || String(value).trim() === '') updates.avatar_url = null
      else {
        const raw = String(value).trim()
        if (raw.length > 2048 || avatar(raw) !== raw) throw fail('Avatar URL must be a valid HTTP or HTTPS URL.')
        updates.avatar_url = raw
      }
    } else if (field === 'rating_history_public') {
      if (![true, false, 1, 0, '1', '0'].includes(value)) throw fail('Rating history visibility is invalid.')
      updates.rating_history_public = profileHistoryIsPublic(value) ? 1 : 0
    }
  }
  if (Object.keys(updates).length === 0) throw fail('No profile changes were provided.')
  return updates
}

export const updateOwnerProfile = async (user, input) => {
  const existing = await ensureOwnerProfile(user)
  const updates = sanitiseProfileUpdates(input)
  const updated = first(await dataProvider.update(COLLECTIONS.profiles, existing.id, updates))
  const merged = { ...existing, ...(updated || {}), ...updates }
  if (!isOwnedBy(merged, user.id) || String(merged.public_id) !== String(existing.public_id)) throw providerFailure()
  return merged
}
