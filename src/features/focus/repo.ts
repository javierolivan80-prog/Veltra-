import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { FocusSession } from "@/types/models";

export async function listFocusSessions(): Promise<FocusSession[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("focus_sessions").select("*").order("completed_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<FocusSession>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("focusSessions", "completedAt");
  return all;
}

export async function addFocusSession(durationMinutes: number): Promise<FocusSession> {
  const now = new Date().toISOString();
  const session: FocusSession = { id: generateId(), durationMinutes, completedAt: now, createdAt: now };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("focus_sessions").insert({ ...toSnakeCase(session), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("focusSessions", session);
  }
  return session;
}
