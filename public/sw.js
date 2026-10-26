// Only public static application resources may enter CacheStorage.
// Vite's closeBundle hook injects all hashed JavaScript/CSS asset paths and a cache version.
const CACHE = 'pourfolio-static-shell-v1'
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']
const BUILD_ASSETS = []
const PRECACHE = [...SHELL, ...BUILD_ASSETS]
const ALLOWED_STATIC = new Set(PRECACHE)

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    // Without a complete app bundle an offline reload would show a blank page.
    // Fail the installation rather than claim the shell works when it is incomplete.
    await cache.addAll(PRECACHE)
    // Updates wait until existing clients close; never replace an active build.
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('pourfolio-static-shell-') && key !== CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || /^\/api(?:\/|$)/.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        // Keep controlled documents and their lazy chunks on the same build.
        return (await cache.match('/index.html')) || fetch(request)
      })()
    )
    return
  }

  // No opportunistic caching: unknown paths, uploads, private media,
  // authentication data and API responses must never enter CacheStorage.
  if (!ALLOWED_STATIC.has(url.pathname)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    // Build assets may carry Vary: Origin. Precache requests have no Origin header,
    // while browser module imports do; only this fixed static allowlist ignores Vary.
    const cached = await cache.match(request, { ignoreVary: true })
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone())
    }
    return response
  })())
})
