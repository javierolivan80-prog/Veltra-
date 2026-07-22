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
