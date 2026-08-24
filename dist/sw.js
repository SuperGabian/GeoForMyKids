const CACHE_NAME = 'geofmykids-shell-v1'
const APP_SHELL = ['/manifest.webmanifest', '/icons/geofmykids-192.png', '/icons/geofmykids-512.png']

async function cacheApplication() {
  const cache = await caches.open(CACHE_NAME)
  const homeResponse = await fetch('/')
  await cache.put('/', homeResponse.clone())

  const html = await homeResponse.text()
  const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1])
  await Promise.allSettled([...APP_SHELL, ...builtAssets].map((url) => cache.add(url)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheApplication())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      }
      return response
    })),
  )
})
