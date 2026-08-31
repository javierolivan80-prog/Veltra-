import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { MealCheck, MealCheckStatus, WaterLog } from "@/types/models";

// --- Agua ---

export async function getWaterLog(date: string): Promise<WaterLog | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("water_logs").select("*").eq("date", date).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<WaterLog>(data);
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("waterLogs", "date", date);
  return all[0] ?? null;
}

/** Adds `delta` glasses to today's count (clamped at 0), upserting by date. */
export async function addWater(date: string, delta: number): Promise<WaterLog> {
  const existing = await getWaterLog(date);
  const log: WaterLog = {
    id: existing?.id ?? generateId(),
    date,
    count: Math.max(0, (existing?.count ?? 0) + delta),
    updatedAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("water_logs").upsert({ ...toSnakeCase(log), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("waterLogs", log);
  }
  return log;
}

// --- Check de comidas ---

export async function getMealCheck(date: string): Promise<MealCheck | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("meal_checks").select("*").eq("date", date).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<MealCheck>(data);
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("mealChecks", "date", date);
  return all[0] ?? null;
}

export async function setMealCheck(date: string, status: MealCheckStatus): Promise<MealCheck> {
  const existing = await getMealCheck(date);
  const check: MealCheck = { id: existing?.id ?? generateId(), date, status, createdAt: existing?.createdAt ?? new Date().toISOString() };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("meal_checks").upsert({ ...toSnakeCase(check), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("mealChecks", check);
  }
  return check;
}

/** Last 30 days of water logs, oldest first — used for the simple history list. */
export async function listWaterLogs(days = 30): Promise<WaterLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("water_logs").select("*").order("date", { ascending: true }).limit(days);
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<WaterLog>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("waterLogs", "date");
  return all.slice(-days);
}
