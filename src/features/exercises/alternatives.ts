import type { Equipment, Exercise } from "@/types/models";

export interface ExerciseAlternative {
  exercise: Exercise;
  reason: "same_pattern" | "same_muscle";
  sharedMuscleGroups: number;
}

/**
 * Alternatives for one exercise — same movement pattern first (closest
 * substitute for the same stimulus), then same muscle group with a
 * different pattern. Only ever suggests exercises the equipment on hand
 * can actually perform; that's the whole point (gym is busy, machine is
 * broken, only have dumbbells today).
 */
export function findAlternatives(exercise: Exercise, allExercises: Exercise[], equipmentAvailable: Equipment[], limit = 4): ExerciseAlternative[] {
  const candidates = allExercises.filter((ex) => {
    if (ex.id === exercise.id) return false;
    if (!ex.equipment.some((e) => equipmentAvailable.includes(e))) return false;
    return ex.muscleGroups.some((m) => exercise.muscleGroups.includes(m));
  });

  const scored = candidates.map((ex) => {
    const sharedMuscleGroups = ex.muscleGroups.filter((m) => exercise.muscleGroups.includes(m)).length;
    const reason: ExerciseAlternative["reason"] = ex.pattern === exercise.pattern ? "same_pattern" : "same_muscle";
    return { exercise: ex, reason, sharedMuscleGroups };
  });

  return scored
    .sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === "same_pattern" ? -1 : 1;
      return b.sharedMuscleGroups - a.sharedMuscleGroups;
    })
    .slice(0, limit);
}
