import { getDb } from "@/src/lib/db/client";
import { generateId } from "@/src/lib/id";
import { enqueueMutation } from "@/src/lib/sync/queue";
import type { Equipment, Exercise, MuscleGroup, StrengthPattern } from "@/src/types/models";

function mapRow(r: any): Exercise {
  return {
    id: r.id,
    name: r.name,
    muscleGroups: JSON.parse(r.muscle_groups ?? "[]"),
    equipment: JSON.parse(r.equipment ?? "[]"),
    pattern: r.pattern,
    notes: r.notes,
    videoUrl: r.video_url,
    isFavorite: !!r.is_favorite,
    isCustom: !!r.is_custom,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM exercises ORDER BY name COLLATE NOCASE ASC`);
  return rows.map(mapRow);
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM exercises WHERE name LIKE ? ORDER BY name COLLATE NOCASE ASC`, [`%${query}%`]);
  return rows.map(mapRow);
}

export async function listFavoriteExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM exercises WHERE is_favorite = 1 ORDER BY name COLLATE NOCASE ASC`);
  return rows.map(mapRow);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM exercises WHERE id = ?`, [id]);
  return row ? mapRow(row) : null;
}

export interface ExerciseInput {
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  pattern: StrengthPattern;
  notes?: string | null;
  videoUrl?: string | null;
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO exercises (id, name, muscle_groups, equipment, pattern, notes, video_url, is_favorite, is_custom, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    [id, input.name, JSON.stringify(input.muscleGroups), JSON.stringify(input.equipment), input.pattern, input.notes ?? null, input.videoUrl ?? null, now, now]
  );
  await enqueueMutation("exercises", id, "upsert");
  return (await getExercise(id))!;
}

export async function updateExercise(id: string, input: Partial<ExerciseInput>): Promise<void> {
  const db = await getDb();
  const existing = await getExercise(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE exercises SET name = ?, muscle_groups = ?, equipment = ?, pattern = ?, notes = ?, video_url = ?, updated_at = ? WHERE id = ?`,
    [
      input.name ?? existing.name,
      JSON.stringify(input.muscleGroups ?? existing.muscleGroups),
      JSON.stringify(input.equipment ?? existing.equipment),
      input.pattern ?? existing.pattern,
      input.notes !== undefined ? input.notes : existing.notes,
      input.videoUrl !== undefined ? input.videoUrl : existing.videoUrl,
      now,
      id,
    ]
  );
  await enqueueMutation("exercises", id, "upsert");
}

export async function toggleFavorite(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE exercises SET is_favorite = NOT is_favorite WHERE id = ?`, [id]);
  await enqueueMutation("exercises", id, "upsert");
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
  const db = await getDb();
  await db.runAsync(`DELETE FROM exercises WHERE id = ?`, [id]);
  await enqueueMutation("exercises", id, "delete");
}
