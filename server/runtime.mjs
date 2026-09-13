import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import authHandler from '../api/auth-proxy.js'
import dataHandler from '../api/data-router.js'
import healthHandler from '../api/health.js'
import readinessHandler from '../api/readiness.js'
import { MAX_REQUEST_BYTES } from '../api/_lib/httpSecurity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const INDEX_FILE = path.join(DIST_DIR, 'index.html')

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
})

const MIME_TYPES = Object.freeze({
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
})

export const buildQuery = (url) => {
  const query = Object.create(null)
  for (const [key, value] of url.searchParams) {
    if (query[key] === undefined) query[key] = value
    else if (Array.isArray(query[key])) query[key].push(value)
    else query[key] = [query[key], value]
  }
  return query
}

export const applySecurityHeaders = (response) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value)
}

export const decorateResponse = (response) => {
  response.status = (statusCode) => {
    response.statusCode = statusCode
    return response
  }

  response.json = (payload) => {
    if (!response.hasHeader('Content-Type')) response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(payload))
    return response
  }

  response.send = (payload) => {
    if (payload === undefined || payload === null) {
      response.end()
      return response
    }
    if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
      response.end(payload)
      return response
    }
    if (typeof payload === 'object') return response.json(payload)
    response.end(String(payload))
    return response
  }

  return response
}

const readRequestBody = async (request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined

  const chunks = []
  let totalBytes = 0
  for await (const chunk of request) {
    totalBytes += chunk.length
    if (totalBytes > MAX_REQUEST_BYTES) {
      const error = new Error('Request body is too large.')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }

  if (!chunks.length) return undefined
  const body = Buffer.concat(chunks)
  const contentType = String(request.headers['content-type'] || '').toLowerCase()
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(body.toString('utf8'))
    } catch {
      const error = new Error('Request body is not valid JSON.')
      error.status = 400
      throw error
    }
  }
  return body
}

const decodedRoutePath = (pathname, prefix) => pathname
  .slice(prefix.length)
  .split('/')
  .filter(Boolean)
  .map((segment) => decodeURIComponent(segment))
  .join('/')

export const apiRoute = (pathname) => {
  if (pathname === '/api/health' || pathname === '/api/health/') return { handler: healthHandler, path: null }
  if (pathname === '/api/readiness' || pathname === '/api/readiness/') return { handler: readinessHandler, path: null }

  const authPrefix = '/api/nocodebackend/auth/'
  if (pathname === '/api/nocodebackend/auth' || pathname.startsWith(authPrefix)) {
    return { handler: authHandler, path: pathname === '/api/nocodebackend/auth' ? '' : decodedRoutePath(pathname, authPrefix) }
  }

  const dataPrefix = '/api/nocodebackend/'
  if (pathname === '/api/nocodebackend' || pathname.startsWith(dataPrefix)) {
    return { handler: dataHandler, path: pathname === '/api/nocodebackend' ? '' : decodedRoutePath(pathname, dataPrefix) }
  }

  return null
}

export const safeDistPath = (pathname) => {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relative = decoded.replace(/^\/+/, '')
  const candidate = path.resolve(DIST_DIR, relative)
  if (candidate !== DIST_DIR && !candidate.startsWith(`${DIST_DIR}${path.sep}`)) return null
  return candidate
}

const sendFile = async (request, response, filePath, { immutable = false } = {}) => {
  let fileStat
  try {
    fileStat = await stat(filePath)
    if (!fileStat.isFile()) return false
    await access(filePath)
  } catch {
    return false
  }

  const extension = path.extname(filePath).toLowerCase()
  response.setHeader('Content-Type', MIME_TYPES[extension] || 'application/octet-stream')
  response.setHeader('Content-Length', String(fileStat.size))
  if (immutable) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  else if (!response.hasHeader('Cache-Control')) response.setHeader('Cache-Control', 'no-cache')

  if (request.method === 'HEAD') {
    response.statusCode = 200
    response.end()
    return true
  }

  response.statusCode = 200
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.pipe(response)
  })
  return true
}

const sendApiNotFound = (response) => response.status(404).json({ error: 'API route not found.' })

export const handleRequest = async (request, rawResponse) => {
  const response = decorateResponse(rawResponse)
  applySecurityHeaders(response)

  const host = request.headers.host || 'localhost'
  const url = new URL(request.url || '/', `http://${host}`)
  request.query = buildQuery(url)

  if (url.pathname.startsWith('/api/')) {
    const route = apiRoute(url.pathname)
    if (!route) return sendApiNotFound(response)

    try {
      request.body = await readRequestBody(request)
    } catch (error) {
      return response.status(error?.status || 400).json({ error: error.message || 'Invalid request body.' })
    }

    if (route.path !== null) request.query.path = route.path
    return route.handler(request, response)
  }

  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.setHeader('Allow', 'GET, HEAD')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const requestedFile = safeDistPath(url.pathname)
  if (requestedFile && url.pathname !== '/') {
    const served = await sendFile(request, response, requestedFile, { immutable: url.pathname.startsWith('/assets/') })
    if (served) return
  }

  const servedIndex = await sendFile(request, response, INDEX_FILE)
  if (!servedIndex) {
    return response.status(503).json({
      error: 'Application build is unavailable. Run npm run build before starting the server.'
    })
  }
}

export const createPourfolioServer = () => createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (response.headersSent) {
      response.destroy(error)
      return
    }
    decorateResponse(response)
    applySecurityHeaders(response)
    response.status(500).json({ error: 'Internal server error.' })
  })
})

export const runtimePaths = Object.freeze({ ROOT_DIR, DIST_DIR, INDEX_FILE })
export const securityHeaders = SECURITY_HEADERS
