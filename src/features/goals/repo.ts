import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { GoalCheckpoint, LifeGoal } from "@/types/models";

export interface LifeGoalInput {
  name: string;
  description: string | null;
  targetDate: string | null;
}

// --- Metas ---

export async function listGoals(): Promise<LifeGoal[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<LifeGoal>(r));
  }
  const db = await getDb();
  const all = await db.getAll("goals");
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getGoal(id: string): Promise<LifeGoal | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<LifeGoal>(data);
  }
  const db = await getDb();
  return (await db.get("goals", id)) ?? null;
}

export async function createGoal(input: LifeGoalInput): Promise<LifeGoal> {
  const now = new Date().toISOString();
  const goal: LifeGoal = { id: generateId(), name: input.name, description: input.description, targetDate: input.targetDate, createdAt: now, updatedAt: now };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("goals").insert({ ...toSnakeCase(goal), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("goals", goal);
  }
  return goal;
}

export async function deleteGoal(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("goals").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("goals", id);
  const tx = db.transaction("goalCheckpoints", "readwrite");
  const checkpoints = await tx.store.index("goalId").getAll(id);
  await Promise.all(checkpoints.map((c) => tx.store.delete(c.id)));
  await tx.done;
}

// --- Checkpoints ---

export async function listCheckpoints(goalId: string): Promise<GoalCheckpoint[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("goal_checkpoints").select("*").eq("goal_id", goalId).order("position", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<GoalCheckpoint>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("goalCheckpoints", "goalId", goalId);
  return all.sort((a, b) => a.position - b.position);
}

export async function addCheckpoint(goalId: string, name: string, position: number): Promise<GoalCheckpoint> {
  const checkpoint: GoalCheckpoint = { id: generateId(), goalId, name, done: false, position, createdAt: new Date().toISOString() };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("goal_checkpoints").insert({ ...toSnakeCase(checkpoint), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("goalCheckpoints", checkpoint);
  }
  return checkpoint;
}

export async function toggleCheckpoint(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data } = await supabase.from("goal_checkpoints").select("done").eq("id", id).single();
    if (data) await supabase.from("goal_checkpoints").update({ done: !data.done }).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("goalCheckpoints", id);
  if (existing) await db.put("goalCheckpoints", { ...existing, done: !existing.done });
}

export async function deleteCheckpoint(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("goal_checkpoints").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("goalCheckpoints", id);
}
