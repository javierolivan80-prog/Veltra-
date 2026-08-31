import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { MeditationSession } from "@/types/models";

export async function listMeditationSessions(): Promise<MeditationSession[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("meditation_sessions").select("*").order("completed_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<MeditationSession>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("meditationSessions", "completedAt");
  return all;
}

export async function addMeditationSession(durationMinutes: number): Promise<MeditationSession> {
  const now = new Date().toISOString();
  const session: MeditationSession = { id: generateId(), durationMinutes, completedAt: now, createdAt: now };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("meditation_sessions").insert({ ...toSnakeCase(session), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("meditationSessions", session);
  }
  return session;
}

export async function deleteMeditationSession(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("meditation_sessions").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("meditationSessions", id);
}
