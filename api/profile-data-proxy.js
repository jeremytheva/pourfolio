import { requireSessionUser } from './_lib/authSession.js'
import {
  ensureOwnerProfile,
  findPublicProfile,
  parsePublicProfileId,
  profileHistoryIsPublic,
  projectOwnerProfile,
  projectPublicProfile,
  updateOwnerProfile
} from './_lib/profileStore.js'
import { loadPublicRatingHistory } from './_lib/publicProfileHistory.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './_lib/httpSecurity.js'

const writeJson = (response, status, payload) => {
  response.setHeader?.('Cache-Control', 'no-store')
  response.status(status).json(payload)
}

const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  if (!raw) return []
  return String(raw).split('/').filter(Boolean)
}

const getPublicProfile = async (identifier, response) => {
  const publicId = parsePublicProfileId(identifier)
  const record = await findPublicProfile(publicId)
  if (!record) {
    writeJson(response, 404, { error: 'User profile not found.' })
    return
  }

  const profile = projectPublicProfile(record)
  if (!profileHistoryIsPublic(record.rating_history_public)) {
    writeJson(response, 200, { profile, ratings: [], summary: { count: 0, average: null } })
    return
  }

  const history = await loadPublicRatingHistory(record.user_id)
  writeJson(response, 200, { profile, ...history })
}

export const routeProfileRequest = async (request, response, user) => {
  const [resource, identifier, extra] = pathSegments(request)

  if (request.method === 'GET' && resource === 'profiles' && identifier && !extra) {
    await getPublicProfile(identifier, response)
    return
  }

  if ((!resource || resource === 'profile') && !identifier) {
    if (request.method === 'GET') {
      const profile = await ensureOwnerProfile(user)
      writeJson(response, 200, { profile: projectOwnerProfile(profile) })
      return
    }
    if (request.method === 'PUT') {
      const profile = await updateOwnerProfile(user, request.body)
      writeJson(response, 200, { profile: projectOwnerProfile(profile) })
      return
    }
  }

  writeJson(response, 404, { error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  if (!['GET', 'PUT'].includes(request.method)) {
    response.setHeader?.('Allow', 'GET, PUT')
    writeJson(response, 405, { error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, {
    key: request.method === 'GET' ? 'profile-read' : 'profile-write',
    limit: request.method === 'GET' ? 240 : 60
  })) return

  try {
    const user = await requireSessionUser(request)
    await routeProfileRequest(request, response, user)
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500
    writeJson(response, status, {
      error: status < 500 && error?.message ? error.message : safeErrorMessage(status),
      ...(error?.code ? { code: String(error.code).toLowerCase() } : {})
    })
  }
}
