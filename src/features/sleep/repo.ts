import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SleepLog } from "@/types/models";

export interface SleepLogInput {
  date: string;
  bedTime: string;
  sleepTime: string;
  wakeTime: string;
  riseTime: string;
  quality: number | null;
  notes: string | null;
}

export async function listSleepLogs(): Promise<SleepLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("sleep_logs").select("*").order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<SleepLog>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("sleepLogs", "date");
  return all;
}

export async function getSleepLogByDate(date: string): Promise<SleepLog | null> {
  const all = await listSleepLogs();
  return all.find((l) => l.date === date) ?? null;
}

export async function upsertSleepLog(input: SleepLogInput): Promise<SleepLog> {
  const now = new Date().toISOString();
  const existing = await getSleepLogByDate(input.date);
  const log: SleepLog = {
    id: existing?.id ?? generateId(),
    date: input.date,
    bedTime: input.bedTime,
    sleepTime: input.sleepTime,
    wakeTime: input.wakeTime,
    riseTime: input.riseTime,
    quality: input.quality,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    // onConflict targets the table's real unique key (one log per user per
    // night) rather than the client-generated id: if the "existing" lookup
    // above raced with another save (e.g. a fast double-tap) and missed a
    // row that was just inserted, upserting by id alone would try to INSERT
    // a second row and fail on the unique constraint instead of updating it.
    const { error } = await supabase.from("sleep_logs").upsert({ ...toSnakeCase(log), user_id: userId }, { onConflict: "user_id,date" });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("sleepLogs", log);
  }
  return log;
}

export async function deleteSleepLog(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("sleep_logs").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("sleepLogs", id);
}
