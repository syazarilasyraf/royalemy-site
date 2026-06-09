const SHELL_CACHE = 'royalemy-shell-v4';
const IMAGE_CACHE = 'royalemy-images-v4';
const FONT_CACHE = 'royalemy-fonts-v4';
const API_CACHE = 'royalemy-api-v4';

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
              name !== FONT_CACHE &&
              name !== API_CACHE;
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
    if (pathname === '/api/cards' || pathname.startsWith('/api/locations')) {
      return 'cache-first';
    }
    if (pathname === '/api/meta-decks') {
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

  // JS/CSS bundles and other assets
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'document') {
    return 'stale-while-revalidate';
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
            caches.open(API_CACHE).then((cache) => cache.put(request, responseToCache))
              .then(() => pruneCache(API_CACHE, 100));
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

  // Navigation requests (SPA routing): serve index.html from cache, revalidate in background
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseToCache))
              .then(() => pruneCache(SHELL_CACHE, 50));
          }
          return response;
        }).catch(() => {
          // Network failed: try exact cache, then index.html, then offline page
          return cached || caches.match('/index.html').then((fallback) => {
            return fallback || caches.match('/offline.html');
          });
        });

        return cached || fetchPromise;
      })
    );
    return;
  }

  if (strategy === 'stale-while-revalidate') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseToCache))
              .then(() => pruneCache(SHELL_CACHE, 50));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
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
    const options = {
      body: data.body || 'You have a new tournament update.',
      icon: data.icon || '/royalemy.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'royalemy-update',
      requireInteraction: false,
      data: {
        tournamentId: data.tournamentId,
        url: data.url || '/'
      },
      actions: [
        { action: 'open', title: 'View Tournament' },
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
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/community-tournaments') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
