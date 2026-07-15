import { nocodeBackend } from '../lib/nocodeBackend'

const PROFILES = 'profiles'

const firstRecord = (records) => (Array.isArray(records) ? records[0] || null : null)

export const getCurrentUserProfile = async (userId) => {
  if (!userId) return { data: null, error: { message: 'User id is required' } }

  const direct = await nocodeBackend.get(PROFILES, userId)
  if (!direct.error && direct.data) return direct

  const byUserId = await nocodeBackend.list(PROFILES, { filters: { user_id: userId } })
  if (!byUserId.error) {
    const profile = firstRecord(byUserId.data)
    return { data: profile, error: profile ? null : direct.error }
  }

  return { data: null, error: direct.error || byUserId.error }
}

export const updateCurrentUserProfile = async (userId, updates, currentProfile = null) => {
  if (!userId) return { data: null, error: { message: 'User id is required' } }

  const profileId = currentProfile?.id || userId
  const updatePayload = {
    ...updates,
    user_id: currentProfile?.user_id || userId
  }

  const direct = await nocodeBackend.update(PROFILES, profileId, updatePayload)
  if (!direct.error) return direct

  if (profileId !== userId) return direct

  const existing = await getCurrentUserProfile(userId)
  if (existing.error || !existing.data?.id) return direct

  return nocodeBackend.update(PROFILES, existing.data.id, {
    ...updates,
    user_id: existing.data.user_id || userId
  })
}
