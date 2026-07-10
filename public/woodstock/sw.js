const CACHE_NAME = 'woodstock-home-v1';
const APP_SHELL = [
  '/woodstock/',
  '/woodstock/index.html',
  '/woodstock/manifest.webmanifest',
  '/woodstock/icons/icon-192.png',
  '/woodstock/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/woodstock/', copy));
          return response;
        })
        .catch(() => caches.match('/woodstock/'))
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/woodstock/')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }))
    );
  }
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Woodstock Home', {
      body: data.body || 'You have a house task due.',
      icon: '/woodstock/icons/icon-192.png',
      badge: '/woodstock/icons/icon-192.png',
      tag: data.tag || 'woodstock-reminder',
      data: { url: data.url || '/woodstock/#maintenance' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/woodstock/#maintenance';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
