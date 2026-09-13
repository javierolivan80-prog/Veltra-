// Veltra Contrato — aviso de reenganche cuando la app entera lleva días sin
// abrirse (Supabase Edge Function).
//
// Las otras tres funciones de push (send-habit-reminders, send-streak-nudges,
// send-commitment-nudges) reaccionan siempre a una regla concreta: hoy toca
// esto, este hábito lleva racha, este compromiso lleva 2 fallos. Ninguna
// detecta el caso más simple y más caro — que el usuario, sencillamente, ha
// dejado de entrar. Un compromiso puede no estar "en riesgo" todavía porque
// ninguno tocaba esta semana, y aun así llevar días sin ninguna actividad.
//
// Esta función mira, para cada usuario con contrato activo, la fecha más
// reciente de cualquier registro suyo en cualquier módulo (entrenamiento,
// sueño, nutrición, meditación, enfoque, diario, fe, hábitos) y avisa una
// sola vez, exactamente al tercer día sin nada, citando el "por qué" que
// escribió al firmar — el mismo gesto que send-commitment-nudges usa para un
// compromiso concreto, aplicado aquí a la app entera.
//
// Required secrets: las mismas que las otras tres (VAPID_*).

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@veltra.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// A mediodía, no a las 20:30: send-commitment-nudges ya ocupa esa hora para
// avisos del día concreto — este es un aviso distinto, de la app entera, y
// solapar ambos en el mismo minuto sería empezar el día con dos pushes.
const NUDGE_TIME = "12:00";
const INACTIVITY_DAYS = 3;

function nowInTimezone(tz: string): { hhmm: string; date: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hhmm: `${get("hour")}:${get("minute")}` };
}

function daysBetween(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

function maxDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  return valid.length > 0 ? valid.sort().at(-1)! : null;
}

/** Última fecha con cualquier actividad registrada, en cualquier módulo —
 *  cada consulta pide solo la más reciente (order + limit 1), no la lista
 *  entera, porque aquí solo importa el máximo. */
async function lastActivityDate(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const [workout, sleep, food, meditation, focus, journal, faith, habit] = await Promise.all([
    supabase.from("workout_sessions").select("started_at").eq("user_id", userId).eq("status", "completed").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sleep_logs").select("date").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("food_meals").select("date").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("meditation_sessions").select("completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("focus_sessions").select("completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("journal_entries").select("date").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("faith_checkins").select("date").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("habit_logs").select("date").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return maxDate([
    workout.data?.started_at?.slice(0, 10),
    sleep.data?.date,
    food.data?.date,
    meditation.data?.completed_at?.slice(0, 10),
    focus.data?.completed_at?.slice(0, 10),
    journal.data?.date,
    faith.data?.date,
    habit.data?.date,
  ]);
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: profiles } = await supabase.from("profile").select("id, timezone").not("timezone", "is", null);
  const due = (profiles ?? []).filter((p: { timezone: string }) => nowInTimezone(p.timezone).hhmm === NUDGE_TIME);
  if (due.length === 0) return new Response("no users due", { status: 200 });

  let sent = 0;
  let usersNudged = 0;

  for (const profile of due as { id: string; timezone: string }[]) {
    const { date: today } = nowInTimezone(profile.timezone);

    const { data: contract } = await supabase.from("contracts").select("why").eq("user_id", profile.id).eq("status", "active").maybeSingle();
    if (!contract?.why) continue; // sin contrato o sin "por qué" no hay nada propio que citarle.

    const lastActive = (await lastActivityDate(supabase, profile.id)) ?? today;
    const gap = daysBetween(lastActive, today);
    if (gap !== INACTIVITY_DAYS) continue; // un solo aviso, exactamente al tercer día — no cada día que pase.

    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", profile.id);
    if (!subs || subs.length === 0) continue;

    const body = `Llevas ${INACTIVITY_DAYS} días sin abrir Veltra. Tú dijiste: "${contract.why}"`;
    const payload = JSON.stringify({ title: "Veltra", body });

    usersNudged++;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, payload);
        sent++;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ usersNudged, notificationsSent: sent }), { status: 200, headers: { "Content-Type": "application/json" } });
});
