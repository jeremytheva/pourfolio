import { requireSessionUser } from './_lib/authSession.js'

const writeJson = (response, status, payload) => {
  response.setHeader?.('Cache-Control', 'no-store')
  response.status(status).json(payload)
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
