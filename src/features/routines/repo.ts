import { getDb } from "@/src/lib/db/client";
import { generateId } from "@/src/lib/id";
import { enqueueMutation } from "@/src/lib/sync/queue";
import type { Routine, RoutineExercise } from "@/src/types/models";

function mapRoutineExercise(r: any): RoutineExercise {
  return {
    id: r.id,
    routineId: r.routine_id,
    exerciseId: r.exercise_id,
    order: r.order,
    targetSets: r.target_sets,
    targetRepsMin: r.target_reps_min,
    targetRepsMax: r.target_reps_max,
    restSeconds: r.rest_seconds,
  };
}

async function attachExercises(routineRow: any): Promise<Routine> {
  const db = await getDb();
  const exRows = await db.getAllAsync<any>(`SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY "order" ASC`, [routineRow.id]);
  return {
    id: routineRow.id,
    name: routineRow.name,
    description: routineRow.description,
    isTemplate: !!routineRow.is_template,
    exercises: exRows.map(mapRoutineExercise),
    createdAt: routineRow.created_at,
    updatedAt: routineRow.updated_at,
  };
}

export async function listRoutines(): Promise<Routine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM routines ORDER BY updated_at DESC`);
  return Promise.all(rows.map(attachExercises));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM routines WHERE id = ?`, [id]);
  return row ? attachExercises(row) : null;
}

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

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO routines (id, name, description, is_template, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)`, [
    id,
    input.name,
    input.description ?? null,
    now,
    now,
  ]);
  for (let i = 0; i < input.exercises.length; i++) {
    const ex = input.exercises[i];
    await db.runAsync(
      `INSERT INTO routine_exercises (id, routine_id, exercise_id, "order", target_sets, target_reps_min, target_reps_max, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), id, ex.exerciseId, i, ex.targetSets, ex.targetRepsMin, ex.targetRepsMax, ex.restSeconds]
    );
  }
  await enqueueMutation("routines", id, "upsert");
  return (await getRoutine(id))!;
}

export async function updateRoutine(id: string, input: RoutineInput): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE routines SET name = ?, description = ?, updated_at = ? WHERE id = ?`, [input.name, input.description ?? null, now, id]);
  await db.runAsync(`DELETE FROM routine_exercises WHERE routine_id = ?`, [id]);
  for (let i = 0; i < input.exercises.length; i++) {
    const ex = input.exercises[i];
    await db.runAsync(
      `INSERT INTO routine_exercises (id, routine_id, exercise_id, "order", target_sets, target_reps_min, target_reps_max, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), id, ex.exerciseId, i, ex.targetSets, ex.targetRepsMin, ex.targetRepsMax, ex.restSeconds]
    );
  }
  await enqueueMutation("routines", id, "upsert");
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM routine_exercises WHERE routine_id = ?`, [id]);
  await db.runAsync(`DELETE FROM routines WHERE id = ?`, [id]);
  await enqueueMutation("routines", id, "delete");
}
