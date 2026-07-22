import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Exercise, PersonalRecord, RecordType } from "@/types/models";
import { estimatedOneRepMax } from "./stats";

const TYPES: RecordType[] = ["weight", "1rm", "volume", "reps"];

async function currentBest(exerciseId: string, type: RecordType): Promise<number | null> {
  const prs = await listPersonalRecords(exerciseId);
  const matching = prs.filter((p) => p.type === type);
  if (matching.length === 0) return null;
  return Math.max(...matching.map((p) => p.value));
}

export interface NewSetContext {
  setId: string;
  exercise: Exercise;
  weightKg: number;
  reps: number;
  completedAt: string;
  bodyweightKg: number | null;
  sessionVolumeSoFar: number;
}

export async function checkAndRecordPRs(ctx: NewSetContext): Promise<PersonalRecord[]> {
  const broken: PersonalRecord[] = [];
  const candidates: Record<RecordType, number> = {
    weight: ctx.weightKg,
    "1rm": Math.round(estimatedOneRepMax(ctx.exercise, ctx.weightKg, ctx.reps, ctx.bodyweightKg) * 10) / 10,
    volume: ctx.sessionVolumeSoFar,
    reps: ctx.reps,
  };

  for (const type of TYPES) {
    const best = await currentBest(ctx.exercise.id, type);
    const candidate = candidates[type];
    if (best !== null && candidate <= best) continue;

    const record: PersonalRecord = {
      id: generateId(),
      exerciseId: ctx.exercise.id,
      type,
      value: candidate,
      previousValue: best,
      achievedAt: ctx.completedAt,
      setEntryId: ctx.setId,
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowserClient()!;
      const userId = await requireUserId();
      await supabase.from("personal_records").insert({ ...toSnakeCase(record), user_id: userId });
    } else {
      const db = await getDb();
      await db.put("personalRecords", record);
    }
    broken.push(record);
  }

  return broken;
}

export async function listPersonalRecords(exerciseId: string): Promise<PersonalRecord[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("personal_records").select("*").eq("exercise_id", exerciseId).order("achieved_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<PersonalRecord>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("personalRecords", "exerciseId", exerciseId);
  return all.sort((a, b) => b.achievedAt.localeCompare(a.achievedAt));
}

export interface RecentPR extends PersonalRecord {
  exerciseName: string;
}

export async function listRecentPRs(limit = 10): Promise<RecentPR[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase
      .from("personal_records")
      .select("*, exercises(name)")
      .order("achieved_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r: Record<string, unknown>) => {
      const { exercises, ...rest } = r;
      const exerciseName = (exercises as { name?: string } | null)?.name ?? "Ejercicio";
      return { ...toCamelCase<PersonalRecord>(rest), exerciseName };
    });
  }

  const db = await getDb();
  const all = await db.getAll("personalRecords");
  const sorted = all.sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)).slice(0, limit);
  const withNames: RecentPR[] = [];
  for (const pr of sorted) {
    const exercise = await db.get("exercises", pr.exerciseId);
    withNames.push({ ...pr, exerciseName: exercise?.name ?? "Ejercicio" });
  }
  return withNames;
}
