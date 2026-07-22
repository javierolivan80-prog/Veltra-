import { getDb } from "@/lib/db/client";
import type { StoredRoutine } from "@/lib/db/schema";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Routine, RoutineExercise } from "@/types/models";

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
}

export interface RoutineInput {
  name: string;
  description?: string | null;
  exercises: RoutineExerciseInput[];
}

async function attachExercisesLocal(routine: StoredRoutine): Promise<Routine> {
  const db = await getDb();
  const all = await db.getAllFromIndex("routineExercises", "routineId", routine.id);
  return { ...routine, exercises: all.sort((a, b) => a.order - b.order) };
}

export async function listRoutines(): Promise<Routine[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data: routineRows, error } = await supabase.from("routines").select("*").order("updated_at", { ascending: false });
    if (error || !routineRows) return [];
    const { data: exerciseRows } = await supabase.from("routine_exercises").select("*").order("order", { ascending: true });
    return routineRows.map((r: any) => {
      const routine = toCamelCase<StoredRoutine>(r);
      const exercises = (exerciseRows ?? []).filter((re: any) => re.routine_id === r.id).map((re: any) => toCamelCase<RoutineExercise>(re));
      return { ...routine, exercises };
    });
  }
  const db = await getDb();
  const all = await db.getAll("routines");
  const withExercises = await Promise.all(all.map(attachExercisesLocal));
  return withExercises.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("routines").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    const { data: exerciseRows } = await supabase.from("routine_exercises").select("*").eq("routine_id", id).order("order", { ascending: true });
    const routine = toCamelCase<StoredRoutine>(data);
    return { ...routine, exercises: (exerciseRows ?? []).map((re: any) => toCamelCase<RoutineExercise>(re)) };
  }
  const db = await getDb();
  const routine = await db.get("routines", id);
  return routine ? attachExercisesLocal(routine) : null;
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  const id = generateId();
  const now = new Date().toISOString();
  const routineRow: StoredRoutine = { id, name: input.name, description: input.description ?? null, isTemplate: false, createdAt: now, updatedAt: now };
  const routineExercises: RoutineExercise[] = input.exercises.map((ex, i) => ({
    id: generateId(),
    routineId: id,
    exerciseId: ex.exerciseId,
    order: i,
    targetSets: ex.targetSets,
    targetRepsMin: ex.targetRepsMin,
    targetRepsMax: ex.targetRepsMax,
    restSeconds: ex.restSeconds,
  }));

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("routines").insert({ ...toSnakeCase(routineRow), user_id: userId });
    if (routineExercises.length > 0) {
      await supabase.from("routine_exercises").insert(routineExercises.map((re) => ({ ...toSnakeCase(re), user_id: userId })));
    }
  } else {
    const db = await getDb();
    await db.put("routines", routineRow);
    for (const re of routineExercises) await db.put("routineExercises", re);
  }

  return { ...routineRow, exercises: routineExercises };
}

export async function updateRoutine(id: string, input: RoutineInput): Promise<void> {
  const now = new Date().toISOString();
  const routineExercises: RoutineExercise[] = input.exercises.map((ex, i) => ({
    id: generateId(),
    routineId: id,
    exerciseId: ex.exerciseId,
    order: i,
    targetSets: ex.targetSets,
    targetRepsMin: ex.targetRepsMin,
    targetRepsMax: ex.targetRepsMax,
    restSeconds: ex.restSeconds,
  }));

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("routines").update({ name: input.name, description: input.description ?? null, updated_at: now }).eq("id", id);
    await supabase.from("routine_exercises").delete().eq("routine_id", id);
    if (routineExercises.length > 0) {
      await supabase.from("routine_exercises").insert(routineExercises.map((re) => ({ ...toSnakeCase(re), user_id: userId })));
    }
  } else {
    const db = await getDb();
    const existing = await db.get("routines", id);
    if (existing) await db.put("routines", { ...existing, name: input.name, description: input.description ?? null, updatedAt: now });
    const oldExercises = await db.getAllFromIndex("routineExercises", "routineId", id);
    for (const oe of oldExercises) await db.delete("routineExercises", oe.id);
    for (const re of routineExercises) await db.put("routineExercises", re);
  }
}

export async function deleteRoutine(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("routine_exercises").delete().eq("routine_id", id);
    await supabase.from("routines").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  const oldExercises = await db.getAllFromIndex("routineExercises", "routineId", id);
  for (const oe of oldExercises) await db.delete("routineExercises", oe.id);
  await db.delete("routines", id);
}
