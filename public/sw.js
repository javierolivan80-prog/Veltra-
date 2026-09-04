// Veltra service worker — Web Push notifications for Hábitos (Sí/No/Saltado
// without opening the app) plus a basic offline shell cache (Fase 7): Hoy
// has to load without a connection, using whatever was last fetched while
// online, and pick back up once the connection returns.
//
// Runtime caching, not a build-time precache list: this repo has no
// bundler plugin (next-pwa/workbox) generating a manifest of hashed chunk
// URLs, so caching by static list would drift from what's actually
// deployed. Instead every same-origin GET is cached as it's fetched while
// online, and served from that cache when the network fails — the shell
// available offline is exactly whatever pages/assets were visited last.

const SHELL_CACHE = "veltra-shell-v1";
const OFFLINE_FALLBACK_URL = "/dashboard";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== SHELL_CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Documentos (Hoy, Progreso…): red primero, para no enseñar una versión
    // vieja mientras hay conexión. Sin red, la última copia cacheada de esa
    // misma ruta, o si nunca se visitó, la de Hoy — es la pantalla que
    // tiene que estar disponible sin conexión.
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(request)) ?? (await cache.match(OFFLINE_FALLBACK_URL)) ?? Response.error();
        }
      })()
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    // Con hash en el nombre — el mismo contenido para siempre en esa URL,
    // así que cache primero es seguro y evita ir a red por nada.
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        cache.put(request, fresh.clone());
        return fresh;
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const { title, body, habitId, date } = payload;
  event.waitUntil(
    self.registration.showNotification(title || "Veltra", {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: `habit-${habitId}-${date}`,
      data: { habitId, date },
      actions: [
        { action: "done", title: "Sí" },
        { action: "not_done", title: "No" },
        { action: "skipped", title: "Saltado" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { habitId, date } = event.notification.data || {};
  const status = event.action; // "done" | "not_done" | "skipped" | "" (body tap)

  event.waitUntil(
    (async () => {
      if (habitId && date && status) {
        try {
          await fetch("/api/habits/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId, date, status }),
          });
        } catch {
          // Best-effort — if this fails the habit still shows as pending
          // next time the app is opened.
        }
      }

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clients.find((c) => c.url.includes("/habits"));
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow("/habits");
      }
    })()
  );
});
