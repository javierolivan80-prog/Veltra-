// Veltra Contrato — aviso de compromiso a punto de reducirse (Supabase Edge Function).
//
// Mismo espíritu que send-streak-nudges, pero para los compromisos del
// contrato (features/contract/nudges.ts ya hace esto dentro de la app, en
// Hoy — esto es la misma regla, empujada como notificación cuando el
// usuario no tiene la app abierta). detectAutoReductions (adaptive.ts)
// corta la frecuencia a los 3 fallos seguidos; esto avisa un día antes,
// cuando lleva 2, citando el "por qué" que el usuario escribió al firmar.
//
// A diferencia de Hábitos, el contrato no tenía ninguna zona horaria propia
// donde mirar — vive en profile.timezone (migración 0013), capturada en
// cada guardado del perfil igual que habits.timezone. Sin ella para un
// usuario, sencillamente no se le manda nada: no hay hora local con la que
// decidir el momento.
//
// Required secrets: las mismas que send-streak-nudges (VAPID_*).

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@veltra.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const NUDGE_TIME = "20:30";
const LOOKBACK_DAYS = 21;

interface CommitmentRow {
  id: string;
  kind: string;
  title: string;
  days: number[];
  updated_at: string;
}

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

function isDueOn(days: number[], dateKey: string): boolean {
  const [y, m, d] = dateKey.split("-").map(Number);
  return days.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
}

/** Misma regla que trailingMissStreak en features/contract/adaptive.ts —
 *  reimplementada porque una Edge Function Deno no puede importar del
 *  bundle de Next.js. Cambiar una implica revisar la otra. */
function trailingMissStreak(days: number[], updatedAt: string, doneDays: Set<string>, referenceDate: string): number {
  const sinceKey = updatedAt.slice(0, 10);
  let cursor = shiftDate(referenceDate, -1);
  let streak = 0;
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    if (cursor <= sinceKey) break;
    if (isDueOn(days, cursor)) {
      if (doneDays.has(cursor)) break;
      streak++;
    }
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

async function doneDaysForKind(supabase: ReturnType<typeof createClient>, userId: string, kind: string, sinceDate: string): Promise<Set<string>> {
  switch (kind) {
    case "workout": {
      const { data } = await supabase.from("workout_sessions").select("started_at").eq("user_id", userId).eq("status", "completed").gte("started_at", sinceDate);
      return new Set((data ?? []).map((r: { started_at: string }) => r.started_at.slice(0, 10)));
    }
    case "sleep": {
      const { data } = await supabase.from("sleep_logs").select("date").eq("user_id", userId).gte("date", sinceDate);
      return new Set((data ?? []).map((r: { date: string }) => r.date));
    }
    case "nutrition": {
      const { data } = await supabase.from("food_meals").select("date").eq("user_id", userId).gte("date", sinceDate);
      return new Set((data ?? []).map((r: { date: string }) => r.date));
    }
    case "meditation": {
      const { data } = await supabase.from("meditation_sessions").select("completed_at").eq("user_id", userId).gte("completed_at", sinceDate);
      return new Set((data ?? []).map((r: { completed_at: string }) => r.completed_at.slice(0, 10)));
    }
    case "focus": {
      const { data } = await supabase.from("focus_sessions").select("completed_at").eq("user_id", userId).gte("completed_at", sinceDate);
      return new Set((data ?? []).map((r: { completed_at: string }) => r.completed_at.slice(0, 10)));
    }
    case "journaling": {
      const { data } = await supabase.from("journal_entries").select("date").eq("user_id", userId).gte("date", sinceDate);
      return new Set((data ?? []).map((r: { date: string }) => r.date));
    }
    case "faith": {
      const { data } = await supabase.from("faith_checkins").select("date, mass, rosary, prayer, examen").eq("user_id", userId).gte("date", sinceDate);
      return new Set(
        (data ?? [])
          .filter((r: { mass: boolean; rosary: boolean; prayer: boolean; examen: string }) => r.mass || r.rosary || r.prayer || r.examen)
          .map((r: { date: string }) => r.date)
      );
    }
    default:
      return new Set();
  }
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
    const sinceDate = shiftDate(today, -LOOKBACK_DAYS);

    const { data: contract } = await supabase.from("contracts").select("id, why").eq("user_id", profile.id).eq("status", "active").maybeSingle();
    if (!contract) continue;

    const { data: commitments } = await supabase.from("commitments").select("id, kind, title, days, updated_at").eq("contract_id", contract.id);
    const todaysCommitments = (commitments ?? []).filter((c: CommitmentRow) => c.kind !== "habit" && isDueOn(c.days, today));
    if (todaysCommitments.length === 0) continue;

    const atRisk: string[] = [];
    for (const c of todaysCommitments as CommitmentRow[]) {
      const doneDays = await doneDaysForKind(supabase, profile.id, c.kind, sinceDate);
      if (doneDays.has(today)) continue;
      if (trailingMissStreak(c.days, c.updated_at, doneDays, today) === 2) atRisk.push(c.title);
    }
    if (atRisk.length === 0) continue;

    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", profile.id);
    const label = atRisk.length === 1 ? `"${atRisk[0]}"` : `${atRisk.length} compromisos`;
    const why = contract.why ? ` Tú dijiste: "${contract.why}"` : "";
    const body = `Llevas 2 días sin ${label}. Si hoy también falla, bajamos la frecuencia.${why}`;
    const payload = JSON.stringify({ title: "Veltra", body });

    usersNudged++;
    for (const sub of subs ?? []) {
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
