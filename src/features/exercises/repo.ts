import { SEED_EXERCISES, toExercise } from "@/data/seedExercises";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { timeoutAfter } from "@/lib/withTimeout";
import type { Equipment, Exercise, MuscleGroup, StrengthPattern } from "@/types/models";

export interface ExerciseInput {
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  pattern: StrengthPattern;
  notes?: string | null;
  videoUrl?: string | null;
}

// exercises.id is a global primary key (not scoped per user), so each account
// needs its own freshly-generated ids when copying the default library in —
// reusing SEED_EXERCISES' fixed ids would collide across different accounts.
async function seedDefaultExerciseLibrary(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()!;
  const now = new Date().toISOString();
  const rows = SEED_EXERCISES.map((seed) => ({
    ...toSnakeCase(toExercise({ ...seed, id: generateId() }, now)),
    user_id: userId,
  }));
  await Promise.race([supabase.from("exercises").insert(rows), timeoutAfter(15000, "Preparando tu catálogo de ejercicios está tardando demasiado.")]);
}

export async function listExercises(): Promise<Exercise[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("exercises").select("*").order("name", { ascending: true });
    if (error) return [];
    if (data && data.length > 0) return data.map((r: any) => toCamelCase<Exercise>(r));

    // Brand-new account (or every exercise was deleted) — the library must
    // never be empty, same guarantee local/demo mode gives for free.
    const userId = await requireUserId();
    await seedDefaultExerciseLibrary(userId);
    const { data: seeded } = await supabase.from("exercises").select("*").order("name", { ascending: true });
    return (seeded ?? []).map((r: any) => toCamelCase<Exercise>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("exercises", "name");
  return all;
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const all = await listExercises();
  const norm = query.toLowerCase();
  return all.filter((e) => e.name.toLowerCase().includes(norm));
}

export async function listFavoriteExercises(): Promise<Exercise[]> {
  const all = await listExercises();
  return all.filter((e) => e.isFavorite);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("exercises").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<Exercise>(data);
  }
  const db = await getDb();
  return (await db.get("exercises", id)) ?? null;
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const id = generateId();
  const now = new Date().toISOString();
  const exercise: Exercise = {
    id,
    name: input.name,
    muscleGroups: input.muscleGroups,
    equipment: input.equipment,
    pattern: input.pattern,
    notes: input.notes ?? null,
    videoUrl: input.videoUrl ?? null,
    isFavorite: false,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("exercises").insert({ ...toSnakeCase(exercise), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("exercises", exercise);
  }
  return exercise;
}

export async function updateExercise(id: string, input: Partial<ExerciseInput>): Promise<void> {
  const existing = await getExercise(id);
  if (!existing) return;
  const now = new Date().toISOString();
  const updated: Exercise = {
    ...existing,
    name: input.name ?? existing.name,
    muscleGroups: input.muscleGroups ?? existing.muscleGroups,
    equipment: input.equipment ?? existing.equipment,
    pattern: input.pattern ?? existing.pattern,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    videoUrl: input.videoUrl !== undefined ? input.videoUrl : existing.videoUrl,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.from("exercises").update(toSnakeCase(updated)).eq("id", id);
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("exercises", updated);
  }
}

export async function toggleFavorite(id: string): Promise<void> {
  const existing = await getExercise(id);
  if (!existing) return;
  const updated = { ...existing, isFavorite: !existing.isFavorite };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("exercises").update({ is_favorite: updated.isFavorite }).eq("id", id);
  } else {
    const db = await getDb();
    await db.put("exercises", updated);
  }
}

export async function duplicateExercise(id: string): Promise<Exercise> {
  const original = await getExercise(id);
  if (!original) throw new Error("Exercise not found");
  return createExercise({
    name: `${original.name} (copia)`,
    muscleGroups: original.muscleGroups,
    equipment: original.equipment,
    pattern: original.pattern,
    notes: original.notes,
    videoUrl: original.videoUrl,
  });
}

export async function deleteExercise(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("exercises").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("exercises", id);
}
