const assetRoot = new URL('ocr/', self.registration.scope).href
const cachePrefix = `kamargin-ocr:${self.registration.scope}:`
const version = new URL(self.location.href).searchParams.get('v')
const cacheName = `${cachePrefix}${version}`

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (
    request.method !== 'GET' ||
    !request.url.startsWith(assetRoot) ||
    !/\/(?:worker\.min\.js|tesseract-core(?:-(?:relaxedsimd|simd))?-lstm\.wasm\.js)$/.test(
      new URL(request.url).pathname,
    )
  ) {
    return
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    })(),
  )
})
