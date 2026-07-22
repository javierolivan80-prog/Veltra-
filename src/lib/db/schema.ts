import type { DBSchema } from "idb";
import type {
  BodyWeightLog,
  CoachMessage,
  Conversation,
  Exercise,
  Injury,
  MemoryFact,
  PersonalRecord,
  Profile,
  Routine,
  RoutineExercise,
  SetEntry,
  WorkoutSession,
} from "@/types/models";

export const DB_NAME = "veltra";
export const DB_VERSION = 1;

/** The routines store holds the routine row only — its exercises live in the separate routineExercises store, same as the Postgres schema. */
export type StoredRoutine = Omit<Routine, "exercises">;

/**
 * Local IndexedDB schema — the store used when no Supabase project is
 * configured (or as an evaluation "explore with sample data" mode). It's
 * intentionally denormalized/flat, one object store per table, mirroring
 * supabase/migrations/0001_init.sql column-for-column so the same
 * repo-function shape works against either backend.
 */
export interface VeltraDB extends DBSchema {
  profile: { key: string; value: Profile };
  injuries: { key: string; value: Injury };
  bodyWeightLogs: { key: string; value: BodyWeightLog; indexes: { date: string } };
  exercises: { key: string; value: Exercise; indexes: { name: string } };
  routines: { key: string; value: StoredRoutine };
  routineExercises: { key: string; value: RoutineExercise; indexes: { routineId: string } };
  workoutSessions: { key: string; value: WorkoutSession; indexes: { status: string; startedAt: string } };
  setEntries: { key: string; value: SetEntry; indexes: { sessionId: string; exerciseId: string } };
  personalRecords: { key: string; value: PersonalRecord; indexes: { exerciseId: string } };
  conversations: { key: string; value: Conversation };
  coachMessages: { key: string; value: CoachMessage; indexes: { conversationId: string } };
  memoryFacts: { key: string; value: MemoryFact };
}

export const STORE_NAMES = [
  "profile",
  "injuries",
  "bodyWeightLogs",
  "exercises",
  "routines",
  "routineExercises",
  "workoutSessions",
  "setEntries",
  "personalRecords",
  "conversations",
  "coachMessages",
  "memoryFacts",
] as const;
