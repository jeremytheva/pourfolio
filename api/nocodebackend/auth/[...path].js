const NOCODEBACKEND_AUTH_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
])

const getRequestPath = (request) => {
  const path = request.query?.path

  if (Array.isArray(path)) return path.map(encodeURIComponent).join('/')
  if (path) return encodeURIComponent(path)

  return ''
}

const getRequestBody = (request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined
  if (request.body === undefined || request.body === null) return undefined
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) return request.body

  return JSON.stringify(request.body)
}

const copyForwardHeaders = (request) => {
  const headers = {}

  for (const [name, value] of Object.entries(request.headers || {})) {
    const lowerName = name.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lowerName)) continue
    if (lowerName === 'authorization') continue
    if (value === undefined) continue

    headers[name] = Array.isArray(value) ? value.join(', ') : value
  }

  headers.authorization = `Bearer ${process.env.NOCODEBACKEND_SECRET_KEY}`

  if (!headers['content-type'] && !headers['Content-Type'] && request.body) {
    headers['content-type'] = 'application/json'
  }

  return headers
}

const copyResponseHeaders = (upstreamResponse, response) => {
  upstreamResponse.headers.forEach((value, name) => {
    const lowerName = name.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lowerName)) return
    if (lowerName === 'set-cookie') return

    response.setHeader(name, value)
  })

  const setCookies = upstreamResponse.headers.getSetCookie?.()
  if (setCookies?.length) {
    response.setHeader('Set-Cookie', setCookies)
    return
  }

  const setCookie = upstreamResponse.headers.get('set-cookie')
  if (setCookie) response.setHeader('Set-Cookie', setCookie)
}

export default async function handler(request, response) {
  if (!process.env.NOCODEBACKEND_SECRET_KEY) {
    response.status(500).json({ error: 'NoCodeBackend secret is not configured on the server.' })
    return
  }

  const path = getRequestPath(request)
  if (!path) {
    response.status(400).json({ error: 'Missing NoCodeBackend auth action.' })
    return
  }

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(request.query || {})) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item))
    } else if (value !== undefined) {
      query.append(key, value)
    }
  }

  const upstreamUrl = `${NOCODEBACKEND_AUTH_BASE_URL}/${path}${query.size ? `?${query}` : ''}`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: copyForwardHeaders(request),
      body: getRequestBody(request),
      redirect: 'manual'
    })

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer())

    copyResponseHeaders(upstreamResponse, response)
    response.status(upstreamResponse.status).send(responseBody)
  } catch (error) {
    console.error('NoCodeBackend proxy error:', error)
    response.status(502).json({ error: 'NoCodeBackend auth request failed.' })
  }
}
