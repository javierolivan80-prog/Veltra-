// Veltra service worker — exists solely to receive Web Push notifications for
// Hábitos reminders and let the user respond (Sí/No/Saltado) without opening
// the app. No offline caching / asset strategy on purpose: this app is
// online-first with local IndexedDB as its own offline layer already.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
      icon: "/icon.svg",
      badge: "/icon.svg",
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
