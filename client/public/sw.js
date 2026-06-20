const SHELL_CACHE = 'royalemy-shell-v6';
const IMAGE_CACHE = 'royalemy-images-v6';
const FONT_CACHE = 'royalemy-fonts-v6';
const API_CACHE = 'royalemy-api-v6';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/royalemy.png',
];

// Precache shell assets during install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('royalemy-') &&
              name !== SHELL_CACHE &&
              name !== IMAGE_CACHE &&
              name !== FONT_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: prune cache to max entries
async function pruneCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Helper: determine cache strategy based on request
function getStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // API requests
  if (pathname.startsWith('/api/')) {
    // Cards change very rarely; everything under /api/locations (rankings) is dynamic.
    if (pathname === '/api/cards') {
      return 'cache-first';
    }
    if (pathname.startsWith('/api/locations') || pathname === '/api/meta-decks') {
      return 'network-first';
    }
    return 'network-only';
  }

  // Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return 'cache-first';
  }

  // Images (cards, icons, etc.)
  if (request.destination === 'image') {
    return 'cache-first';
  }

  // JS/CSS bundles and other assets — network-first so deployments are picked up immediately
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'document') {
    return 'network-first';
  }

  return 'network-first';
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const strategy = getStrategy(request);
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  if (strategy === 'network-only') {
    return;
  }

  if (strategy === 'cache-first') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          const cacheName = request.destination === 'image' ? IMAGE_CACHE : (url.hostname.includes('fonts') ? FONT_CACHE : API_CACHE);
          const responseToCache = response.clone();
          caches.open(cacheName).then((cache) => cache.put(request, responseToCache))
            .then(() => {
              const max = cacheName === IMAGE_CACHE ? 200 : cacheName === FONT_CACHE ? 50 : 100;
              pruneCache(cacheName, max);
            });
          return response;
        });
      })
    );
    return;
  }

  if (strategy === 'network-first') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            const cacheName = request.mode === 'navigate' || request.destination === 'document'
              ? SHELL_CACHE
              : (url.hostname.includes('fonts') ? FONT_CACHE : API_CACHE);
            caches.open(cacheName).then((cache) => cache.put(request, responseToCache))
              .then(() => {
                const max = cacheName === SHELL_CACHE ? 50 : cacheName === FONT_CACHE ? 50 : 100;
                pruneCache(cacheName, max);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // If it's a navigation request and we're offline, show offline page
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            throw new Error('Network error and no cache available');
          });
        })
    );
    return;
  }

  // Default: network-first with offline fallback
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          throw new Error('Network error');
        });
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'RoyaleMY Update';
    const scope = data.scope || 'global';
    const scopeLabel = scope === 'tournament' ? 'View Tournament' : 'Open RoyaleMY';
    const options = {
      body: data.body || 'You have a new site update.',
      icon: data.icon || '/royalemy.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'royalemy-update',
      requireInteraction: false,
      data: {
        tournamentId: data.tournamentId,
        url: data.url || '/',
        scope
      },
      actions: [
        { action: 'open', title: scopeLabel },
        { action: 'close', title: 'Dismiss' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[SW] Failed to handle push:', e);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
