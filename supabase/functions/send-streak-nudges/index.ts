// Veltra Hábitos — aviso de racha en riesgo (Supabase Edge Function).
//
// Primer aviso proactivo de verdad: hasta ahora la app solo empujaba
// recordatorios de "toca hacer X" (send-habit-reminders); este avisa de
// algo que ya llevas construido y estás a punto de perder. Se apoya en la
// misma infraestructura (VAPID, push_subscriptions, cron cada minuto — ver
// NOTIFICATIONS_SETUP.md) en vez de montar nada nuevo.
//
// A una hora fija por usuario (NUDGE_TIME, en su propia zona horaria), si
// algún hábito suyo lleva racha de MIN_STREAK días o más y hoy todavía no
// tiene respuesta, manda un único push avisando. Deliberadamente limitado a
// Hábitos: es el único módulo con zona horaria guardada por usuario hoy —
// extenderlo a sueño/ánimo/etc. necesita antes un sitio donde capturarla.
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

// Por la tarde-noche: todavía da tiempo a actuar, pero el día ya se
// perfila en blanco si no ha pasado nada a estas alturas.
const NUDGE_TIME = "20:30";
// Mismo umbral que features/insights/signals.ts para no afirmar patrones
// de dos días — una racha solo importa si ya costó sostenerla.
const MIN_STREAK = 3;

interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  timezone: string | null;
}

/** "HH:MM" y "YYYY-MM-DD" para `tz` ahora mismo — igual que en send-habit-reminders. */
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

function shiftDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/** Días consecutivos con status "done" terminando en `throughDate` (inclusive). */
function streakThrough(doneDates: Set<string>, throughDate: string): number {
  let streak = 0;
  let cursor = throughDate;
  while (doneDates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: habits } = await supabase.from("habits").select("id, user_id, name, timezone").not("timezone", "is", null);

  const due = (habits ?? []).filter((h: HabitRow) => nowInTimezone(h.timezone ?? "UTC").hhmm === NUDGE_TIME);
  if (due.length === 0) return new Response("no users due", { status: 200 });

  // Un solo push por usuario aunque tenga varios hábitos en racha a la vez.
  const atRisk = new Map<string, { habitNames: string[]; maxStreak: number }>();

  for (const habit of due as HabitRow[]) {
    const tz = habit.timezone ?? "UTC";
    const { date: today } = nowInTimezone(tz);
    const yesterday = shiftDate(today, -1);

    const { data: todayLog } = await supabase.from("habit_logs").select("id").eq("habit_id", habit.id).eq("date", today).maybeSingle();
    if (todayLog) continue; // ya respondió hoy (done, not_done o skipped) — nada que avisar.

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("date")
      .eq("habit_id", habit.id)
      .eq("status", "done")
      .order("date", { ascending: false })
      .limit(90);
    const doneDates = new Set((logs ?? []).map((l: { date: string }) => l.date));
    const streak = streakThrough(doneDates, yesterday);
    if (streak < MIN_STREAK) continue;

    const entry = atRisk.get(habit.user_id) ?? { habitNames: [], maxStreak: 0 };
    entry.habitNames.push(habit.name);
    entry.maxStreak = Math.max(entry.maxStreak, streak);
    atRisk.set(habit.user_id, entry);
  }

  if (atRisk.size === 0) return new Response("no streaks at risk", { status: 200 });

  let sent = 0;
  for (const [userId, { habitNames, maxStreak }] of atRisk) {
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
    const label = habitNames.length === 1 ? `"${habitNames[0]}"` : `${habitNames.length} hábitos`;
    const body = `Llevas racha de ${maxStreak} en ${label} y hoy todavía no lo has marcado — no la rompas.`;
    const payload = JSON.stringify({ title: "Veltra", body });

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
  }

  return new Response(JSON.stringify({ usersAtRisk: atRisk.size, notificationsSent: sent }), { status: 200, headers: { "Content-Type": "application/json" } });
});
