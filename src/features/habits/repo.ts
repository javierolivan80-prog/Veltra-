import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Habit, HabitLog, HabitLogStatus } from "@/types/models";

export interface HabitInput {
  name: string;
  notificationTime: string | null;
  timezone: string | null;
}

// --- Habits ---

export async function listHabits(): Promise<Habit[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("habits").select("*").order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<Habit>(r));
  }
  const db = await getDb();
  const all = await db.getAll("habits");
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getHabit(id: string): Promise<Habit | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("habits").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<Habit>(data);
  }
  const db = await getDb();
  return (await db.get("habits", id)) ?? null;
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const now = new Date().toISOString();
  const habit: Habit = {
    id: generateId(),
    name: input.name,
    notificationTime: input.notificationTime,
    timezone: input.timezone,
    createdAt: now,
    updatedAt: now,
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("habits").insert({ ...toSnakeCase(habit), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("habits", habit);
  }
  return habit;
}

export async function updateHabit(id: string, input: Partial<HabitInput>): Promise<void> {
  const existing = await getHabit(id);
  if (!existing) return;
  const updated: Habit = {
    ...existing,
    name: input.name ?? existing.name,
    notificationTime: input.notificationTime !== undefined ? input.notificationTime : existing.notificationTime,
    timezone: input.timezone !== undefined ? input.timezone : existing.timezone,
    updatedAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.from("habits").update(toSnakeCase(updated)).eq("id", id);
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("habits", updated);
  }
}

export async function deleteHabit(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("habits").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("habits", id);
  const tx = db.transaction("habitLogs", "readwrite");
  const logs = await tx.store.index("habitId").getAll(id);
  await Promise.all(logs.map((l) => tx.store.delete(l.id)));
  await tx.done;
}

// --- Habit logs ---

export async function listHabitLogs(habitId: string): Promise<HabitLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("habit_logs").select("*").eq("habit_id", habitId).order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<HabitLog>(r));
  }
  const db = await getDb();
  const logs = await db.getAllFromIndex("habitLogs", "habitId", habitId);
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

/** Every habit log the user has, across all habits — used for the combined
 *  "Hoy" streak, which needs to check "was anything marked not_done today". */
export async function listAllHabitLogs(): Promise<HabitLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("habit_logs").select("*").order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<HabitLog>(r));
  }
  const db = await getDb();
  return db.getAll("habitLogs");
}

/** All habits' logs for a single day — used to render "pendientes hoy". */
export async function listHabitLogsForDate(date: string): Promise<HabitLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("habit_logs").select("*").eq("date", date);
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<HabitLog>(r));
  }
  const db = await getDb();
  const all = await db.getAll("habitLogs");
  return all.filter((l) => l.date === date);
}

/** Upsert by (habitId, date) — one log per habit per day. */
export async function logHabit(habitId: string, date: string, status: HabitLogStatus): Promise<HabitLog> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const existing = await supabase.from("habit_logs").select("id").eq("habit_id", habitId).eq("date", date).maybeSingle();
    const log: HabitLog = { id: existing.data?.id ?? generateId(), habitId, date, status, respondedAt: now };
    // onConflict targets the table's real unique key (one log per habit per
    // day) rather than the client-generated id — see the identical comment
    // in features/sleep/repo.ts's upsertSleepLog for why this matters.
    const { error } = await supabase.from("habit_logs").upsert({ ...toSnakeCase(log), user_id: userId }, { onConflict: "habit_id,date" });
    if (error) throw error;
    return log;
  }

  const db = await getDb();
  const existingLogs = await db.getAllFromIndex("habitLogs", "habitId", habitId);
  const existing = existingLogs.find((l) => l.date === date);
  const log: HabitLog = { id: existing?.id ?? generateId(), habitId, date, status, respondedAt: now };
  await db.put("habitLogs", log);
  return log;
}
