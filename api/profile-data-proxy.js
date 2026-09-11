import { requireSessionUser } from './_lib/authSession.js'

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

const publicProfileId = (value) => {
  const id = String(value ?? '').trim()
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) {
    const error = new Error('Profile identifier is invalid.')
    error.status = 400
    throw error
  }
  return id
}

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'PUT') {
    response.setHeader?.('Allow', 'GET, PUT')
    writeJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  let user
  try {
    user = await requireSessionUser(request)
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500
    writeJson(response, status, {
      error: status === 401 ? 'Authentication is required.' : 'Profile service is unavailable.',
      ...(error?.code ? { code: String(error.code).toLowerCase() } : {})
    })
    return
  }

  const [resource, identifier] = pathSegments(request)
  const isPublicProfileRequest = resource === 'profiles'

  if (request.method === 'GET' && isPublicProfileRequest) {
    try {
      publicProfileId(identifier)
    } catch (error) {
      writeJson(response, error.status || 400, { error: error.message, code: 'invalid_profile_identifier' })
      return
    }

    // The route exists so the browser/public-profile surface has a stable
    // contract, but it must not read ratings by owner id until #422 deploys a
    // certified profiles collection with opaque public_id and explicit
    // rating_history_public consent.
    writeJson(response, 503, {
      error: 'Public user profiles are unavailable until profile persistence is deployed.',
      code: 'profile_persistence_unavailable'
    })
    return
  }

  if (request.method === 'GET') {
    writeJson(response, 200, {
      profile: {
        id: user.id,
        name: user.name || 'User',
        description: '',
        avatar_url: null
      }
    })
    return
  }

  writeJson(response, 503, {
    error: 'Profile editing is unavailable until profile persistence is deployed.',
    code: 'profile_persistence_unavailable'
  })
}
