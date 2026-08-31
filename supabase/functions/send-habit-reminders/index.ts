// Veltra Hábitos — background reminder sender (Supabase Edge Function).
//
// Triggered every minute by a pg_cron job (set up manually — see
// NOTIFICATIONS_SETUP.md at the repo root, since it needs this function's
// deployed URL, which doesn't exist until after the first deploy).
//
// For each habit whose `notification_time` (evaluated in its own `timezone`)
// matches the current minute, and that has no habit_log for today yet, sends
// a Web Push notification to every subscription the owning user has.
//
// Required secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT — a mailto: or https: contact URL, e.g. mailto:you@example.com
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime — no need to set them.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@veltra.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  notification_time: string | null;
  timezone: string | null;
}

/** "HH:MM" and "YYYY-MM-DD" for `tz` right now. */
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

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: habits } = await supabase
    .from("habits")
    .select("id, user_id, name, notification_time, timezone")
    .not("notification_time", "is", null);

  const due = (habits ?? []).filter((h: HabitRow) => {
    const tz = h.timezone ?? "UTC";
    const { hhmm } = nowInTimezone(tz);
    return hhmm === h.notification_time;
  });

  if (due.length === 0) return new Response("no habits due", { status: 200 });

  let sent = 0;
  for (const habit of due as HabitRow[]) {
    const tz = habit.timezone ?? "UTC";
    const { date } = nowInTimezone(tz);

    const { data: existingLog } = await supabase.from("habit_logs").select("id").eq("habit_id", habit.id).eq("date", date).maybeSingle();
    if (existingLog) continue;

    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", habit.user_id);
    for (const sub of subs ?? []) {
      const payload = JSON.stringify({ title: "Veltra", body: `¿Hiciste "${habit.name}" hoy?`, habitId: habit.id, date });
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, payload);
        sent++;
      } catch (err) {
        // Expired/invalid subscription (410 Gone) — drop it so future runs stop retrying it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ habitsDue: due.length, notificationsSent: sent }), { status: 200, headers: { "Content-Type": "application/json" } });
});
