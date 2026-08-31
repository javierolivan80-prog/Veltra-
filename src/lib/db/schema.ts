import type { DBSchema } from "idb";
import type {
  Addiction,
  AddictionRelapse,
  BodyWeightLog,
  CoachMessage,
  Conversation,
  Exercise,
  FoodConversation,
  FoodMeal,
  FoodMessage,
  Habit,
  HabitLog,
  Injury,
  MemoryFact,
  NutritionGoals,
  SavedMeal,
  PersonalRecord,
  Profile,
  PushSubscriptionRow,
  Routine,
  RoutineExercise,
  SetEntry,
  SleepLog,
  WorkoutSession,
} from "@/types/models";

export const DB_NAME = "veltra";
export const DB_VERSION = 4;

/** Single-row store for the local nutrition goals — mirrors the per-user Supabase row. */
export type StoredNutritionGoals = NutritionGoals & { id: string };

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
  foodConversations: { key: string; value: FoodConversation; indexes: { date: string } };
  foodMessages: { key: string; value: FoodMessage; indexes: { conversationId: string } };
  foodMeals: { key: string; value: FoodMeal; indexes: { conversationId: string; date: string } };
  nutritionGoals: { key: string; value: StoredNutritionGoals };
  savedMeals: { key: string; value: SavedMeal };
  habits: { key: string; value: Habit };
  habitLogs: { key: string; value: HabitLog; indexes: { habitId: string } };
  sleepLogs: { key: string; value: SleepLog; indexes: { date: string } };
  addictions: { key: string; value: Addiction };
  addictionRelapses: { key: string; value: AddictionRelapse; indexes: { addictionId: string } };
  pushSubscriptions: { key: string; value: PushSubscriptionRow };
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
  "foodConversations",
  "foodMessages",
  "foodMeals",
  "nutritionGoals",
  "savedMeals",
  "habits",
  "habitLogs",
  "sleepLogs",
  "addictions",
  "addictionRelapses",
  "pushSubscriptions",
] as const;
