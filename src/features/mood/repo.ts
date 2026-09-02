import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DailyMood, MoodOption } from "@/types/models";

export async function listDailyMoods(): Promise<DailyMood[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("daily_moods").select("*").order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<DailyMood>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("dailyMoods", "date");
  return all;
}

export async function getDailyMoodByDate(date: string): Promise<DailyMood | null> {
  const all = await listDailyMoods();
  return all.find((m) => m.date === date) ?? null;
}

export async function upsertDailyMood(date: string, mood: MoodOption): Promise<DailyMood> {
  const now = new Date().toISOString();
  const existing = await getDailyMoodByDate(date);
  const entry: DailyMood = {
    id: existing?.id ?? generateId(),
    date,
    mood,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    // onConflict targets the table's real unique key (one mood per user per
    // day) rather than the client-generated id — see the identical comment
    // in features/sleep/repo.ts's upsertSleepLog for why this matters.
    const { error } = await supabase.from("daily_moods").upsert({ ...toSnakeCase(entry), user_id: userId }, { onConflict: "user_id,date" });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("dailyMoods", entry);
  }
  return entry;
}
