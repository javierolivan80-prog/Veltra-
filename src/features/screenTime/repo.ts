import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ScreenTimeLog } from "@/types/models";

export async function listScreenTimeLogs(): Promise<ScreenTimeLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("screen_time_logs").select("*").order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<ScreenTimeLog>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("screenTimeLogs", "date");
  return all;
}

export async function getScreenTimeByDate(date: string): Promise<ScreenTimeLog | null> {
  const all = await listScreenTimeLogs();
  return all.find((l) => l.date === date) ?? null;
}

export async function upsertScreenTimeLog(date: string, hours: number): Promise<ScreenTimeLog> {
  const now = new Date().toISOString();
  const existing = await getScreenTimeByDate(date);
  const log: ScreenTimeLog = { id: existing?.id ?? generateId(), date, hours, createdAt: existing?.createdAt ?? now, updatedAt: now };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("screen_time_logs").upsert({ ...toSnakeCase(log), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("screenTimeLogs", log);
  }
  return log;
}

export async function deleteScreenTimeLog(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("screen_time_logs").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("screenTimeLogs", id);
}
