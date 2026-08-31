// Client-side Web Push helpers — used by the Hábitos "Activar notificaciones"
// flow. Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY to be set and a Supabase
// project configured (see NOTIFICATIONS_SETUP.md); without either, this
// degrades to a no-op and Hábitos falls back to its in-app "pendientes hoy"
// prompt.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js");
}

/** Requests permission, registers the SW, subscribes to push, and saves the
 *  subscription server-side. Throws if the user denies permission or push
 *  isn't supported — callers should surface that to the user. */
export async function enableHabitReminders(): Promise<void> {
  if (!isPushSupported()) throw new Error("Este navegador no soporta notificaciones push.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permiso de notificaciones denegado.");

  const registration = await registerServiceWorker();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) throw new Error("No se pudo guardar la suscripción.");
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
