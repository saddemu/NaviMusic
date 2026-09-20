/*
 * NaviMusic service worker.
 *
 * Its whole job is to make the app shell installable and launchable without a
 * network round trip. It deliberately does NOT touch the Navidrome server:
 * every request to it is cross-origin, carries credentials, and in the case of
 * `stream` is an open-ended range response that has no business in a cache.
 * Those requests fall straight through to the network.
 *
 * The version string is what invalidates the cache — bump it whenever the
 * caching rules below change. Hashed build assets do not need it, since a new
 * build gives them new filenames.
 */
const VERSION = 'v1';
const SHELL_CACHE = `navimusic-shell-${VERSION}`;
const ASSET_CACHE = `navimusic-assets-${VERSION}`;

/** Entry points that have to be there for a cold, offline launch. */
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // One failure (a missing icon, say) must not fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // 'pmusic-' is the pre-rename prefix: keep purging it so the caches
            // an older install left behind do not linger forever.
            .filter(
              (k) =>
                (k.startsWith('navimusic-') || k.startsWith('pmusic-')) &&
                k !== SHELL_CACHE &&
                k !== ASSET_CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Lets the page ask a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(fallbackUrl ?? request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Anything that is not this app — the Navidrome API, its cover art, its
  // audio streams — is none of the worker's business.
  if (url.origin !== self.location.origin) return;
  // Range requests are for media; never try to satisfy one from a cache.
  if (request.headers.has('range')) return;

  // Navigation: always prefer the network so a deploy is picked up on the next
  // launch, and fall back to the cached shell when there is none. Every route
  // is client-side, so they all resolve to the same document.
  if (request.mode === 'navigate') {
    // `networkFirst` already falls back to the cached shell; this catch is
    // the case where there is no cached shell either.
    event.respondWith(networkFirst(request, SHELL_CACHE, '/').catch(() => Response.error()));
    return;
  }

  // Hashed build output is immutable: a changed file has a changed name.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Icons, the manifest, fonts: serve what we have, refresh it in the
  // background so the next launch gets the newer copy.
  if (/\.(svg|png|ico|woff2?|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
