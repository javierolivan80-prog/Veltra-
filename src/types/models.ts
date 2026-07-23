// Core domain model for Veltra.
// These types are shared by the local SQLite layer, the Supabase schema,
// and every screen — keep them in sync with supabase/migrations/0001_init.sql.

export type Sex = "male" | "female" | "other";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type Goal = "strength" | "hypertrophy" | "fat_loss" | "endurance" | "general_fitness";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "traps"
  | "cardio"
  | "full_body";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "smith_machine"
  | "other";

/** Movement pattern used to look up strength-standard tables for the rank system. */
export type StrengthPattern =
  | "squat"
  | "hinge"
  | "horizontal_press"
  | "vertical_press"
  | "horizontal_pull"
  | "vertical_pull"
  | "isolation"
  | "carry"
  | "core";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  sex: Sex;
  birthDate: string | null; // ISO date
  heightCm: number | null;
  bodyweightKg: number | null;
  experienceLevel: ExperienceLevel;
  goal: Goal;
  trainingDaysPerWeek: number;
  equipmentAvailable: Equipment[];
  createdAt: string;
  updatedAt: string;
}

export interface Injury {
  id: string;
  area: string; // e.g. "shoulder_right", "lower_back"
  note: string;
  active: boolean;
  createdAt: string;
}

export interface BodyWeightLog {
  id: string;
  date: string; // ISO date
  weightKg: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  pattern: StrengthPattern;
  notes: string | null;
  videoUrl: string | null;
  isFavorite: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  exercises: RoutineExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
}

export type SessionStatus = "active" | "completed" | "discarded";

export interface WorkoutSession {
  id: string;
  routineId: string | null;
  routineName: string | null;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
}

export interface SetEntry {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completedAt: string;
}

export type RecordType = "1rm" | "weight" | "volume" | "reps";

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: RecordType;
  value: number;
  previousValue: number | null;
  achievedAt: string;
  setEntryId: string | null;
}

export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "elite";

export interface ExerciseRank {
  exerciseId: string;
  tier: RankTier;
  percentile: number; // 0-100
  score: number; // relative-strength score used to compute tier
  nextTier: RankTier | null;
  progressToNext: number; // 0-1
  amountToNextKg: number | null;
}

export type MessageRole = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface MemoryFact {
  id: string;
  content: string;
  category: "injury" | "preference" | "goal" | "constraint" | "other";
  active: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Veltra Food — nutrition assistant. A conversation is created per day
// automatically; the user chats what they ate (text + photos) and the AI
// registers meals with estimated macros that roll up into daily totals.
// ---------------------------------------------------------------------

/** One chat thread per calendar day. `date` is the local day key (YYYY-MM-DD). */
export interface FoodConversation {
  id: string;
  date: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** A chat bubble in a food conversation. `photos` are data URLs (compressed client-side). */
export interface FoodMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  photos: string[];
  mealId: string | null; // set on the assistant message that registered a meal
  createdAt: string;
}

/** A single food item the AI detected inside a meal. */
export interface DetectedFood {
  name: string;
  quantity: string; // e.g. "180 g", "1 unidad", "1 taza"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** A registered meal — the nutrition record that daily totals are summed from. */
export interface FoodMeal {
  id: string;
  conversationId: string;
  messageId: string | null;
  date: string; // local day key (YYYY-MM-DD)
  note: string; // short label, e.g. "Desayuno", "Comida"
  foods: DetectedFood[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  createdAt: string;
}

/** Per-user daily nutrition targets. */
export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  updatedAt: string;
}

/** Aggregate of every meal on a given day — derived, never stored. */
export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealCount: number;
}
