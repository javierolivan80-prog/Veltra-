// Veltra Entrenamiento — aviso real de fin de descanso (Supabase Edge Function).
//
// RestTimer.tsx ya avisa dentro de la propia pestaña (sonido/vibración/
// notificación local), pero eso depende de que el navegador siga ejecutando
// su JS — en iOS Safari, con la pantalla bloqueada o la app en segundo
// plano, se congela y el aviso llega tarde, solo al reabrir. Esta función
// es la red de seguridad: cron cada minuto (misma infraestructura que
// send-habit-reminders — ver NOTIFICATIONS_SETUP.md), revisa qué descansos
// ya han terminado y manda un push real, que sí llega con la pestaña
// dormida (con hasta ~60s de margen por la granularidad del cron).
//
// rest_alerts.id lo genera el cliente al empezar el descanso
// (workoutSession.store.ts) y borra la fila si el descanso se cancela o se
// sustituye antes de tiempo — aquí solo llegan las que sobreviven hasta su
// hora.
//
// Required secrets: las mismas que send-habit-reminders (VAPID_*).

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@veltra.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface RestAlertRow {
  id: string;
  user_id: string;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: due } = await supabase.from("rest_alerts").select("id, user_id").lte("ends_at", new Date().toISOString());
  if (!due || due.length === 0) return new Response("no rest alerts due", { status: 200 });

  const payload = JSON.stringify({ title: "¡Tiempo!", body: "Descanso terminado — a por la siguiente serie." });
  let sent = 0;

  for (const alert of due as RestAlertRow[]) {
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", alert.user_id);
    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, payload);
        sent++;
      } catch (err) {
        // Suscripción caducada/inválida (410 Gone) — se borra para que no se reintente para siempre.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
    // Se borra siempre, tenga o no suscripciones a las que mandar — llegado
    // su momento, esta fila ya cumplió su función.
    await supabase.from("rest_alerts").delete().eq("id", alert.id);
  }

  return new Response(JSON.stringify({ due: due.length, notificationsSent: sent }), { status: 200, headers: { "Content-Type": "application/json" } });
});
