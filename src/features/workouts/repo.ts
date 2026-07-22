import { getDb } from "@/src/lib/db/client";
import { getExercise } from "@/src/features/exercises/repo";
import { checkAndRecordPRs } from "@/src/features/exercises/prs";
import { getProfile } from "@/src/features/profile/repo";
import { generateId } from "@/src/lib/id";
import { enqueueMutation } from "@/src/lib/sync/queue";
import type { PersonalRecord, SetEntry, WorkoutSession } from "@/src/types/models";

function mapSession(r: any): WorkoutSession {
  return {
    id: r.id,
    routineId: r.routine_id,
    routineName: r.routine_name,
    status: r.status,
    startedAt: r.started_at,
    endedAt: r.ended_at,
  };
}

function mapSet(r: any): SetEntry {
  return {
    id: r.id,
    sessionId: r.session_id,
    exerciseId: r.exercise_id,
    setNumber: r.set_number,
    weightKg: r.weight_kg,
    reps: r.reps,
    rir: r.rir,
    rpe: r.rpe,
    isWarmup: !!r.is_warmup,
    completedAt: r.completed_at,
  };
}

export async function getActiveSession(): Promise<WorkoutSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM workout_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`);
  return row ? mapSession(row) : null;
}

export async function startSession(routineId: string | null, routineName: string | null): Promise<WorkoutSession> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO workout_sessions (id, routine_id, routine_name, status, started_at, ended_at) VALUES (?, ?, ?, 'active', ?, NULL)`, [
    id,
    routineId,
    routineName,
    now,
  ]);
  await enqueueMutation("workout_sessions", id, "upsert");
  return { id, routineId, routineName, status: "active", startedAt: now, endedAt: null };
}

export async function endSession(id: string, status: "completed" | "discarded" = "completed"): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE workout_sessions SET status = ?, ended_at = ? WHERE id = ?`, [status, now, id]);
  await enqueueMutation("workout_sessions", id, "upsert");
}

export async function getSessionSets(sessionId: string): Promise<SetEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM set_entries WHERE session_id = ? ORDER BY completed_at ASC`, [sessionId]);
  return rows.map(mapSet);
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
  const db = await getDb();
  const exercise = await getExercise(input.exerciseId);
  if (!exercise) throw new Error("Exercise not found");

  const countRow = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM set_entries WHERE session_id = ? AND exercise_id = ?`, [
    input.sessionId,
    input.exerciseId,
  ]);
  const setNumber = (countRow?.count ?? 0) + 1;
  const id = generateId();
  const completedAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO set_entries (id, session_id, exercise_id, set_number, weight_kg, reps, rir, rpe, is_warmup, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.sessionId, input.exerciseId, setNumber, input.weightKg, input.reps, input.rir, input.rpe, input.isWarmup ? 1 : 0, completedAt]
  );
  await enqueueMutation("set_entries", id, "upsert");

  const sessionSets = await db.getAllAsync<any>(`SELECT weight_kg, reps FROM set_entries WHERE session_id = ? AND exercise_id = ?`, [
    input.sessionId,
    input.exerciseId,
  ]);
  const sessionVolumeSoFar = sessionSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);

  const profile = await getProfile();
  const prsBroken = input.isWarmup
    ? []
    : await checkAndRecordPRs(db, {
        setId: id,
        exercise,
        weightKg: input.weightKg,
        reps: input.reps,
        completedAt,
        bodyweightKg: profile?.bodyweightKg ?? null,
        sessionVolumeSoFar,
      });

  return { set: mapSet({ id, session_id: input.sessionId, exercise_id: input.exerciseId, set_number: setNumber, weight_kg: input.weightKg, reps: input.reps, rir: input.rir, rpe: input.rpe, is_warmup: input.isWarmup ? 1 : 0, completed_at: completedAt }), prsBroken };
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM set_entries WHERE id = ?`, [id]);
  await enqueueMutation("set_entries", id, "delete");
}

export async function updateSet(id: string, input: Partial<Pick<SetEntry, "weightKg" | "reps" | "rir" | "rpe">>): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<any>(`SELECT * FROM set_entries WHERE id = ?`, [id]);
  if (!existing) return;
  await db.runAsync(`UPDATE set_entries SET weight_kg = ?, reps = ?, rir = ?, rpe = ? WHERE id = ?`, [
    input.weightKg ?? existing.weight_kg,
    input.reps ?? existing.reps,
    input.rir !== undefined ? input.rir : existing.rir,
    input.rpe !== undefined ? input.rpe : existing.rpe,
    id,
  ]);
  await enqueueMutation("set_entries", id, "upsert");
}

/** The last completed (non-warmup) set for this exercise, anywhere — powers the "remember last weight/reps/RIR/RPE" prefill. */
export async function getLastSetForExercise(exerciseId: string, excludeSessionId?: string): Promise<SetEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM set_entries WHERE exercise_id = ? AND is_warmup = 0 ${excludeSessionId ? "AND session_id != ?" : ""} ORDER BY completed_at DESC LIMIT 1`,
    excludeSessionId ? [exerciseId, excludeSessionId] : [exerciseId]
  );
  return row ? mapSet(row) : null;
}

export async function getSetsForExercise(exerciseId: string): Promise<SetEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM set_entries WHERE exercise_id = ? ORDER BY completed_at ASC`, [exerciseId]);
  return rows.map(mapSet);
}

export async function listRecentSessions(limit = 10): Promise<WorkoutSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM workout_sessions WHERE status = 'completed' ORDER BY started_at DESC LIMIT ?`, [limit]);
  return rows.map(mapSession);
}

export async function getSession(id: string): Promise<WorkoutSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM workout_sessions WHERE id = ?`, [id]);
  return row ? mapSession(row) : null;
}

export async function getExerciseIdsInSession(sessionId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ exercise_id: string }>(
    `SELECT DISTINCT exercise_id FROM set_entries WHERE session_id = ? ORDER BY completed_at ASC`,
    [sessionId]
  );
  return rows.map((r) => r.exercise_id);
}

export async function currentStreakDays(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ started_at: string }>(
    `SELECT started_at FROM workout_sessions WHERE status = 'completed' ORDER BY started_at DESC LIMIT 60`
  );
  if (rows.length === 0) return 0;

  const days = new Set(rows.map((r) => new Date(r.started_at).toDateString()));
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
