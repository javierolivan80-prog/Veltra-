import type { Exercise, Injury, MuscleGroup, Profile, WorkoutSession } from "@/types/models";
import type { SetEntry } from "@/types/models";

export interface SuggestionContext {
  profile: Profile | null;
  injuries: Injury[];
  exercises: Exercise[];
  recentSessions: WorkoutSession[];
  setsBySession: Map<string, SetEntry[]>;
}

interface ExerciseFrequency {
  exercise: Exercise;
  daysSinceLastSet: number;
  lastWeight?: number;
  lastReps?: number;
}

/** Group exercises by muscle groups, sorted by days since last trained. */
export function suggestExercisesByFrequency(context: SuggestionContext): ExerciseFrequency[] {
  const now = new Date();
  const muscleGroupsDueForWork = identifyMuscleGroupsDueForWork(context);

  // Filter exercises that match the needed muscle groups and available equipment
  const candidates = context.exercises.filter((ex) => {
    // Must work at least one due muscle group
    if (!ex.muscleGroups.some((m) => muscleGroupsDueForWork.has(m))) return false;

    // Must use available equipment
    if (!ex.equipment.some((e) => context.profile?.equipmentAvailable.includes(e))) return false;

    // Skip if exercise targets an active injury
    if (context.injuries.some((inj) => inj.active && ex.muscleGroups.some((m) => m.includes(inj.area)))) return false;

    return true;
  });

  // Score each candidate by how long it's been since we did it
  const scored = candidates.map((ex) => {
    const lastSet = getLastSetForExercise(context, ex.id);
    const daysSince = lastSet ? Math.floor((now.getTime() - new Date(lastSet.completedAt).getTime()) / 86400000) : 999;

    return {
      exercise: ex,
      daysSinceLastSet: daysSince,
      lastWeight: lastSet?.weightKg,
      lastReps: lastSet?.reps,
    };
  });

  // Sort: prioritize exercises not done recently, then by relevance to muscle groups due
  return scored.sort((a, b) => {
    const aIsDue = a.exercise.muscleGroups.some((m) => muscleGroupsDueForWork.has(m));
    const bIsDue = b.exercise.muscleGroups.some((m) => muscleGroupsDueForWork.has(m));

    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;
    return b.daysSinceLastSet - a.daysSinceLastSet;
  });
}

/** Identify which muscle groups haven't been trained in the last 3-5 days. */
function identifyMuscleGroupsDueForWork(context: SuggestionContext): Set<MuscleGroup> {
  const dueDays = 5; // muscle groups should be trained every 5 days max
  const threshold = new Date(Date.now() - dueDays * 86400000);

  const trainingsByMuscleGroup = new Map<MuscleGroup, Date | null>();
  const allMuscleGroups: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "abs", "traps", "cardio", "full_body"];

  // Initialize all muscle groups as never trained
  for (const mg of allMuscleGroups) {
    trainingsByMuscleGroup.set(mg, null);
  }

  // Find the most recent date each muscle group was trained
  for (const session of context.recentSessions) {
    const sessionDate = new Date(session.startedAt);
    const sets = context.setsBySession.get(session.id) || [];

    for (const set of sets) {
      const exercise = context.exercises.find((e) => e.id === set.exerciseId);
      if (!exercise) continue;

      for (const mg of exercise.muscleGroups) {
        const current = trainingsByMuscleGroup.get(mg);
        if (!current || sessionDate > current) {
          trainingsByMuscleGroup.set(mg, sessionDate);
        }
      }
    }
  }

  // Return muscle groups not trained in the last `dueDays`
  const due = new Set<MuscleGroup>();
  for (const [mg, lastDate] of trainingsByMuscleGroup.entries()) {
    if (!lastDate || lastDate < threshold) {
      due.add(mg);
    }
  }

  return due;
}

/** Find the most recent set for an exercise. */
function getLastSetForExercise(context: SuggestionContext, exerciseId: string): SetEntry | undefined {
  for (const session of context.recentSessions) {
    const sets = context.setsBySession.get(session.id) || [];
    const lastSet = sets
      .filter((s) => s.exerciseId === exerciseId && !s.isWarmup)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

    if (lastSet) return lastSet;
  }
  return undefined;
}

/** Suggest a workout structure based on the profile and history. */
export function suggestWorkoutStructure(context: SuggestionContext): { exercise: Exercise; suggestedSets: number; suggestedRepsMin: number; suggestedRepsMax: number; lastWeight?: number; lastReps?: number }[] {
  const suggested = suggestExercisesByFrequency(context);

  // Take top 4-6 exercises depending on profile experience level
  const count = context.profile?.experienceLevel === "beginner" ? 4 : context.profile?.experienceLevel === "intermediate" ? 5 : 6;
  const selected = suggested.slice(0, count);

  return selected.map(({ exercise, lastWeight, lastReps }) => {
    // Suggest reps based on the user's goal and experience
    const goal = context.profile?.goal ?? "general_fitness";
    const isStrength = goal === "strength";
    const isHypertrophy = goal === "hypertrophy";
    const isEndurance = goal === "endurance";

    let suggestedSets = 3;
    let suggestedRepsMin = 8;
    let suggestedRepsMax = 12;

    if (isStrength) {
      suggestedSets = 4;
      suggestedRepsMin = 3;
      suggestedRepsMax = 6;
    } else if (isHypertrophy) {
      suggestedSets = 3;
      suggestedRepsMin = 8;
      suggestedRepsMax = 12;
    } else if (isEndurance) {
      suggestedSets = 3;
      suggestedRepsMin = 12;
      suggestedRepsMax = 15;
    }

    return {
      exercise,
      suggestedSets,
      suggestedRepsMin,
      suggestedRepsMax,
      lastWeight,
      lastReps,
    };
  });
}
