import { NextResponse } from "next/server";
import { generateId } from "@/lib/id";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Saves (or refreshes) the caller's push subscription so
 *  send-habit-reminders can reach this device. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;
  const p256dh: string | undefined = body?.keys?.p256dh;
  const authKey: string | undefined = body?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const existing = await supabase.from("push_subscriptions").select("id").eq("user_id", user.id).eq("endpoint", endpoint).maybeSingle();
  const id = existing.data?.id ?? generateId();
  const { error } = await supabase.from("push_subscriptions").upsert({ id, user_id: user.id, endpoint, p256dh, auth_key: authKey });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
