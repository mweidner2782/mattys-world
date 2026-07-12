const CACHE_NAME = 'woodstock-home-v5';
const APP_SHELL = [
  '/woodstock/',
  '/woodstock/index.html',
  '/woodstock/schedule.html',
  '/woodstock/schedule.css',
  '/woodstock/schedule.js',
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

function enhanceHomePage(html) {
  if (html.includes("href='/woodstock/schedule.html'")) return html;
  const scheduleLink = "<a href='/woodstock/schedule.html'>Schedule</a>";
  html = html.replace('<nav>', '<nav>' + scheduleLink);
  html = html.replace("<div class='mobile'>", "<div class='mobile'><a href='/woodstock/schedule.html'>🗓 Schedule</a>");
  const floating = "<a href='/woodstock/schedule.html' class='woodstock-schedule-fab' aria-label='Open home schedule'>🗓 <span>Home schedule</span></a><style>.woodstock-schedule-fab{position:fixed;right:18px;bottom:18px;z-index:58;display:flex;align-items:center;gap:8px;padding:13px 16px;border-radius:999px;background:#aa654d;color:#fff;text-decoration:none;font-weight:850;box-shadow:0 12px 35px rgba(31,39,34,.25)}@media(max-width:650px){.mobile{grid-template-columns:repeat(4,1fr)!important}.woodstock-schedule-fab{right:14px;bottom:78px}.woodstock-schedule-fab span{display:none}}</style>";
  return html.replace('</body>', floating + '</body>');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if ((url.pathname === '/woodstock/' || url.pathname === '/woodstock/index.html') && response.ok) {
          const html = enhanceHomePage(await response.text());
          const enhanced = new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
          const copy = enhanced.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/woodstock/', copy));
          return enhanced;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      } catch {
        return caches.match(request) || caches.match('/woodstock/');
      }
    })());
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
  const taskId = data.taskId || '';
  const baseUrl = data.url || '/woodstock/schedule.html';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Woodstock Home', {
      body: data.body || 'You have a house task due.',
      icon: '/woodstock/icons/icon-192.png',
      badge: '/woodstock/icons/icon-192.png',
      tag: data.tag || `woodstock-${taskId || 'reminder'}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'done', title: 'Done' },
        { action: 'snooze', title: 'Snooze 1 day' }
      ],
      data: {
        url: baseUrl,
        taskId,
        controlToken: data.controlToken || '',
        recurrence: data.recurrence || 'none',
        dueAt: data.dueAt || '',
        timeZone: data.timeZone || 'America/New_York'
      }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;
  const params = new URLSearchParams();
  if (action) params.set('notificationAction', action);
  if (data.taskId) params.set('task', data.taskId);
  const target = `/woodstock/schedule.html${params.toString() ? '?' + params.toString() : ''}`;
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
