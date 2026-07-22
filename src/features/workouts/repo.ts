import { getDb } from "@/lib/db/client";
import { getExercise } from "@/features/exercises/repo";
import { checkAndRecordPRs } from "@/features/exercises/prs";
import { getProfile } from "@/features/profile/repo";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PersonalRecord, SetEntry, WorkoutSession } from "@/types/models";

export async function getActiveSession(): Promise<WorkoutSession | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("workout_sessions").select("*").eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<WorkoutSession>(data);
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("workoutSessions", "status", "active");
  if (all.length === 0) return null;
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export async function startSession(routineId: string | null, routineName: string | null): Promise<WorkoutSession> {
  const id = generateId();
  const now = new Date().toISOString();
  const session: WorkoutSession = { id, routineId, routineName, status: "active", startedAt: now, endedAt: null };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("workout_sessions").insert({ ...toSnakeCase(session), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("workoutSessions", session);
  }
  return session;
}

export async function endSession(id: string, status: "completed" | "discarded" = "completed"): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("workout_sessions").update({ status, ended_at: now }).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("workoutSessions", id);
  if (existing) await db.put("workoutSessions", { ...existing, status, endedAt: now });
}

/** Hard-deletes a session and everything logged in it — for "I started this by accident", not for a finished workout (use endSession for that). */
export async function deleteSession(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    // set_entries.session_id has `on delete cascade`, so this also removes its sets.
    await supabase.from("workout_sessions").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  const sets = await db.getAllFromIndex("setEntries", "sessionId", id);
  const tx = db.transaction(["setEntries", "workoutSessions"], "readwrite");
  for (const set of sets) await tx.objectStore("setEntries").delete(set.id);
  await tx.objectStore("workoutSessions").delete(id);
  await tx.done;
}

export async function getSession(id: string): Promise<WorkoutSession | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("workout_sessions").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<WorkoutSession>(data);
  }
  const db = await getDb();
  return (await db.get("workoutSessions", id)) ?? null;
}

export async function getSessionSets(sessionId: string): Promise<SetEntry[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("set_entries").select("*").eq("session_id", sessionId).order("completed_at", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<SetEntry>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("setEntries", "sessionId", sessionId);
  return all.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export interface AddSetInput {
  sessionId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  isWarmup?: boolean;
}

export interface AddSetResult {
  set: SetEntry;
  prsBroken: PersonalRecord[];
}

export async function addSet(input: AddSetInput): Promise<AddSetResult> {
  const exercise = await getExercise(input.exerciseId);
  if (!exercise) throw new Error("Exercise not found");

  const existingSets = await getSessionSets(input.sessionId);
  const sameExerciseSets = existingSets.filter((s) => s.exerciseId === input.exerciseId);
  const setNumber = sameExerciseSets.length + 1;
  const id = generateId();
  const completedAt = new Date().toISOString();

  const set: SetEntry = {
    id,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    setNumber,
    weightKg: input.weightKg,
    reps: input.reps,
    rir: input.rir,
    rpe: input.rpe,
    isWarmup: input.isWarmup ?? false,
    completedAt,
  };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("set_entries").insert({ ...toSnakeCase(set), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("setEntries", set);
  }

  const sessionVolumeSoFar = [...sameExerciseSets, set].reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const profile = await getProfile();
  const prsBroken = input.isWarmup
    ? []
    : await checkAndRecordPRs({
        setId: id,
        exercise,
        weightKg: input.weightKg,
        reps: input.reps,
        completedAt,
        bodyweightKg: profile?.bodyweightKg ?? null,
        sessionVolumeSoFar,
      });

  return { set, prsBroken };
}

export async function deleteSet(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("set_entries").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("setEntries", id);
}

export async function updateSet(id: string, input: Partial<Pick<SetEntry, "weightKg" | "reps" | "rir" | "rpe">>): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("set_entries").update(toSnakeCase(input)).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("setEntries", id);
  if (existing) await db.put("setEntries", { ...existing, ...input });
}

export async function getLastSetForExercise(exerciseId: string, excludeSessionId?: string): Promise<SetEntry | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    let query = supabase.from("set_entries").select("*").eq("exercise_id", exerciseId).eq("is_warmup", false).order("completed_at", { ascending: false }).limit(excludeSessionId ? 5 : 1);
    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;
    const filtered = excludeSessionId ? data.filter((r: any) => r.session_id !== excludeSessionId) : data;
    return filtered.length > 0 ? toCamelCase<SetEntry>(filtered[0]) : null;
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("setEntries", "exerciseId", exerciseId);
  const filtered = all.filter((s) => !s.isWarmup && (!excludeSessionId || s.sessionId !== excludeSessionId));
  if (filtered.length === 0) return null;
  return filtered.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
}

export async function getSetsForExercise(exerciseId: string): Promise<SetEntry[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("set_entries").select("*").eq("exercise_id", exerciseId).order("completed_at", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<SetEntry>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("setEntries", "exerciseId", exerciseId);
  return all.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export async function listRecentSessions(limit = 10): Promise<WorkoutSession[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("workout_sessions").select("*").eq("status", "completed").order("started_at", { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<WorkoutSession>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("workoutSessions", "status", "completed");
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}

export async function getExerciseIdsInSession(sessionId: string): Promise<string[]> {
  const sets = await getSessionSets(sessionId);
  return [...new Set(sets.map((s) => s.exerciseId))];
}

export async function currentStreakDays(): Promise<number> {
  const sessions = await listRecentSessions(60);
  if (sessions.length === 0) return 0;

  const days = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toDateString();
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && key === new Date().toDateString()) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}
