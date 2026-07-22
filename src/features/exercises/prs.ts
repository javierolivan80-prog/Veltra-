import type { SQLiteDatabase } from "expo-sqlite";
import { generateId } from "@/src/lib/id";
import type { Exercise, PersonalRecord, RecordType } from "@/src/types/models";
import { effectiveWeight, estimatedOneRepMax } from "./stats";

const TYPES: RecordType[] = ["weight", "1rm", "volume", "reps"];

async function currentBest(db: SQLiteDatabase, exerciseId: string, type: RecordType): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT value FROM personal_records WHERE exercise_id = ? AND type = ? ORDER BY value DESC LIMIT 1`,
    [exerciseId, type]
  );
  return row?.value ?? null;
}

export interface NewSetContext {
  setId: string;
  exercise: Exercise;
  weightKg: number;
  reps: number;
  completedAt: string;
  bodyweightKg: number | null;
  /** Sum of weight*reps across every set logged for this exercise in the current session so far, including this one. */
  sessionVolumeSoFar: number;
}

/** Called right after a set is saved. Returns the record types broken (if any) so the UI can celebrate. */
export async function checkAndRecordPRs(db: SQLiteDatabase, ctx: NewSetContext): Promise<PersonalRecord[]> {
  const broken: PersonalRecord[] = [];
  const candidates: Record<RecordType, number> = {
    weight: ctx.weightKg,
    "1rm": Math.round(estimatedOneRepMax(ctx.exercise, ctx.weightKg, ctx.reps, ctx.bodyweightKg) * 10) / 10,
    volume: ctx.sessionVolumeSoFar,
    reps: ctx.reps,
  };

  for (const type of TYPES) {
    const best = await currentBest(db, ctx.exercise.id, type);
    const candidate = candidates[type];
    if (best !== null && candidate <= best) continue;

    const id = generateId();
    await db.runAsync(
      `INSERT INTO personal_records (id, exercise_id, type, value, previous_value, achieved_at, set_entry_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, ctx.exercise.id, type, candidate, best, ctx.completedAt, ctx.setId]
    );
    broken.push({
      id,
      exerciseId: ctx.exercise.id,
      type,
      value: candidate,
      previousValue: best,
      achievedAt: ctx.completedAt,
      setEntryId: ctx.setId,
    });
  }

  return broken;
}

export async function listPersonalRecords(db: SQLiteDatabase, exerciseId: string): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<any>(`SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY achieved_at DESC`, [exerciseId]);
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    type: r.type,
    value: r.value,
    previousValue: r.previous_value,
    achievedAt: r.achieved_at,
    setEntryId: r.set_entry_id,
  }));
}

export interface RecentPR extends PersonalRecord {
  exerciseName: string;
}

export async function listRecentPRs(db: SQLiteDatabase, limit = 10): Promise<RecentPR[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT pr.*, e.name as exercise_name FROM personal_records pr JOIN exercises e ON e.id = pr.exercise_id ORDER BY pr.achieved_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    type: r.type,
    value: r.value,
    previousValue: r.previous_value,
    achievedAt: r.achieved_at,
    setEntryId: r.set_entry_id,
    exerciseName: r.exercise_name,
  }));
}

export { effectiveWeight };
