import { NextResponse } from "next/server";
import { generateId } from "@/lib/id";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["done", "not_done", "skipped"]);

/** Records a habit response from the service worker's notification-click
 *  handler, which has no React tree to call the usual repo/hooks through.
 *  Identifies the user via the Supabase session cookie the SW's same-origin
 *  fetch carries automatically. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { habitId, date, status } = body ?? {};
  if (!habitId || !date || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await supabase.from("habit_logs").select("id").eq("habit_id", habitId).eq("date", date).maybeSingle();
  const id = existing.data?.id ?? generateId();
  const { error } = await supabase
    .from("habit_logs")
    .upsert({ id, habit_id: habitId, date, status, responded_at: new Date().toISOString(), user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
