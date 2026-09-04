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
  /** True once the user has finished onboarding. The signup trigger creates the
   *  row with this false; it flips true when the profile form is submitted. */
  onboardingCompleted: boolean;
  /** Optional goal weight shown as progress on the Peso page. */
  targetWeightKg: number | null;
  /** Recuperación no está en la navegación: se activa aquí y entonces
   *  aparece como bloque en Hoy. */
  recoveryEnabled: boolean;
  /** Fe católica — mismo patrón que Recuperación: opcional, se activa aquí. */
  faithEnabled: boolean;
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

export type RecordType = "1rm" | "weight" | "reps";

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

/** A meal the user eats often, saved as a one-tap template (e.g. "3 huevos
 *  revueltos con 2 lonchas de havarti"). Registering one copies its macros
 *  into the day, so editing the template never rewrites past days. */
export interface SavedMeal {
  id: string;
  name: string;
  foods: DetectedFood[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  useCount: number;
  createdAt: string;
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

// ---------------------------------------------------------------------
// Hábitos — a habit the user checks in on daily, with an optional
// notification time. One HabitLog per (habitId, date).
// ---------------------------------------------------------------------

export interface Habit {
  id: string;
  name: string;
  notificationTime: string | null; // "HH:MM", local to `timezone`
  timezone: string | null; // IANA tz captured client-side at creation
  createdAt: string;
  updatedAt: string;
}

export type HabitLogStatus = "done" | "not_done" | "skipped";

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // local day key (YYYY-MM-DD)
  status: HabitLogStatus;
  respondedAt: string;
}

// ---------------------------------------------------------------------
// Sueño — one entry per night, keyed by the local date the user went to
// bed. All duration/latency figures are derived from the four times, not
// stored redundantly.
// ---------------------------------------------------------------------

export interface SleepLog {
  id: string;
  date: string; // local day key (YYYY-MM-DD) of the night this entry covers
  bedTime: string; // "HH:MM"
  sleepTime: string; // "HH:MM" — may roll past midnight relative to bedTime
  wakeTime: string; // "HH:MM" — may roll past midnight relative to sleepTime
  riseTime: string; // "HH:MM"
  quality: number | null; // 1-10
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Adicciones — tracks time since the last relapse. `startDate` is when
// tracking began; the active streak starts at the most recent relapse's
// `fallenAt`, or `startDate` if there's none yet.
// ---------------------------------------------------------------------

export interface Addiction {
  id: string;
  name: string;
  motivation: string | null;
  startDate: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
}

export interface AddictionRelapse {
  id: string;
  addictionId: string;
  fallenAt: string; // ISO datetime
  reason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Push notification subscriptions (Habits background reminders).
// ---------------------------------------------------------------------

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  authKey: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Cuerpo — Nutrición: agua y check simple de comidas, vive dentro de Food.
// One row per (day).
// ---------------------------------------------------------------------

export interface WaterLog {
  id: string;
  date: string; // local day key (YYYY-MM-DD)
  count: number;
  updatedAt: string;
}

export type MealCheckStatus = "good" | "ok" | "bad";

export interface MealCheck {
  id: string;
  date: string;
  status: MealCheckStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Mente — Meditación: una fila por sesión completada.
// ---------------------------------------------------------------------

export interface MeditationSession {
  id: string;
  durationMinutes: number;
  completedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Mente — Journaling: una entrada por día.
// ---------------------------------------------------------------------

export interface JournalEntry {
  id: string;
  date: string;
  gratitude: string;
  learned: string;
  mood: number | null; // 1-10
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Mente — registro rápido de ánimo del día ("¿Cómo estás hoy?").
// Separate from JournalEntry.mood (1-10, tied to a written entry) — this is
// a one-tap daily check-in with no writing required.
// ---------------------------------------------------------------------

export type MoodOption = "low" | "flat" | "good" | "focused";

export interface DailyMood {
  id: string;
  date: string;
  mood: MoodOption;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Mente — Foco (Pomodoro): una fila por bloque de trabajo completado.
// ---------------------------------------------------------------------

export interface FocusSession {
  id: string;
  durationMinutes: number;
  completedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Recuperación — Screen Time: una fila por día.
// ---------------------------------------------------------------------

export interface ScreenTimeLog {
  id: string;
  date: string;
  hours: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Vida — Finanzas.
// ---------------------------------------------------------------------

export interface Expense {
  id: string;
  amount: number;
  category: string | null;
  date: string;
  note: string | null;
  isEssential: boolean;
  createdAt: string;
}

export interface FinanceGoals {
  monthlySavingsGoal: number | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// El contrato — el arco de 30/60/90 días que el usuario firma al empezar.
// Un contrato activo por usuario; sus compromisos son lo que arma el plan
// diario de Hoy.
// ---------------------------------------------------------------------

/** Lo que el usuario dice que quiere cambiar. Ordena el catálogo de
 *  compromisos del paso 2; no restringe lo que puede elegir. */
export type ContractFocus = "body" | "mind" | "recovery" | "routine";

export type ContractStatus = "active" | "completed" | "abandoned";

export interface Contract {
  id: string;
  focus: ContractFocus;
  /** Por qué lo hace, en sus palabras. Se le devuelve cuando lleva días fallando. */
  why: string;
  durationDays: number; // 30 | 60 | 90
  startedOn: string; // local day key (YYYY-MM-DD)
  endsOn: string; // local day key (YYYY-MM-DD)
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}

/** Tipo de bloque en Hoy. Cada compromiso se resuelve en uno de los módulos
 *  que ya existen; no hay compromisos sin sitio donde registrarse. */
export type CommitmentKind = "workout" | "sleep" | "nutrition" | "meditation" | "journaling" | "focus" | "habit" | "faith";

/** Franja, no hora exacta: prometer las 07:30 cuando nadie la ha configurado
 *  es lo que hacía que Hoy dijera "ahora: entrenamiento" a las 23:00. */
export type TimeSlot = "morning" | "afternoon" | "evening";

export interface Commitment {
  id: string;
  contractId: string;
  kind: CommitmentKind;
  title: string;
  /** Días de la semana en convención JS (0 = domingo … 6 = sábado). Su
   *  longitud *es* la frecuencia: "4 veces por semana" son 4 días marcados,
   *  así que no puede contradecirse con un campo aparte. */
  days: number[];
  timeSlot: TimeSlot;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Revisión semanal — cada domingo, un resumen de la semana, un patrón si
// hay datos para afirmarlo, y como mucho una propuesta de cambio al plan.
// ---------------------------------------------------------------------

export type ReviewProposalStatus = "pending" | "accepted" | "kept" | "none";
export type ReviewGeneratedBy = "ai" | "rules";

/** El único cambio concreto que una revisión puede proponer: la frecuencia
 *  o la franja de un compromiso. Nunca más de una propuesta por revisión. */
export interface ReviewProposal {
  commitmentId: string;
  title: string;
  currentDays: number[];
  proposedDays: number[];
  proposedTimeSlot: TimeSlot;
  reason: string;
}

export interface WeeklyReview {
  id: string;
  contractId: string;
  /** Day-key (YYYY-MM-DD) del primer día de la semana revisada. */
  weekStart: string;
  summary: string;
  pattern: string | null;
  proposal: ReviewProposal | null;
  proposalStatus: ReviewProposalStatus;
  generatedBy: ReviewGeneratedBy;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Fe católica — un check-in por día, opcional (ver Profile.faithEnabled).
// El examen de conciencia es texto libre y privado: sin categorías fijas
// de faltas, cada uno lo escribe a su manera.
// ---------------------------------------------------------------------

export interface FaithCheckIn {
  id: string;
  date: string;
  mass: boolean;
  rosary: boolean;
  prayer: boolean;
  examen: string;
  createdAt: string;
  updatedAt: string;
}
