const CACHE = "woodstock-home-v3";
const SHELL = [
  "/woodstock/",
  "/woodstock/index.html",
  "/woodstock/app.css",
  "/woodstock/app.js",
  "/woodstock/manifest.webmanifest",
  "/woodstock/icons/icon-192.png",
  "/woodstock/icons/icon-512.png"
];
const DB = "woodstock-home";
const STORE = "settings";
const CONFIG_KEY = "household";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate" && url.pathname.startsWith("/woodstock")) {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put("/woodstock/", copy));
      return response;
    }).catch(() => caches.match("/woodstock/").then((response) => response || caches.match("/woodstock/index.html"))));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/woodstock/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    })));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_HOUSEHOLD_CONFIG") event.waitUntil(writeSetting(CONFIG_KEY, event.data.config));
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; }
  catch { payload = { title: "Woodstock Home", body: event.data?.text() || "A house reminder is due." }; }
  event.waitUntil(self.registration.showNotification(payload.title || "Woodstock Home", {
    body: payload.body || "A house reminder is due.",
    icon: "/woodstock/icons/icon-192.png",
    badge: "/woodstock/icons/icon-192.png",
    tag: payload.tag || "woodstock-reminder",
    renotify: true,
    requireInteraction: Boolean(payload.requireInteraction),
    data: payload.data || { url: "/woodstock/#reminders" },
    actions: Array.isArray(payload.actions) ? payload.actions : []
  }));
});

self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil((async () => {
    if ((action === "done" || action === "snooze") && data.taskId) {
      const config = await readSetting(CONFIG_KEY).catch(() => null);
      if (config?.pinHash && config?.owner && config?.apiUrl) {
        try {
          await fetch(config.apiUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: action === "done" ? "completeTask" : "snoozeTask",
              payload: action === "done" ? { taskId: data.taskId } : { taskId: data.taskId, hours: 24 },
              pinHash: config.pinHash,
              owner: config.owner,
              deviceId: config.deviceId
            })
          });
        } catch {}
      }
    }
    const target = data.url || "/woodstock/#reminders";
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).pathname.startsWith("/woodstock"));
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(target);
    } else await self.clients.openWindow(target);
  })());
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeSetting(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readSetting(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
