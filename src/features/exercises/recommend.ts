import { listExercises } from "@/features/exercises/repo";
import { getSetsForExercise } from "@/features/workouts/repo";
import { getProfile, listInjuries } from "@/features/profile/repo";
import { weeklyFrequency } from "@/features/exercises/stats";
import type { Exercise, Injury, StrengthPattern } from "@/types/models";

const INJURY_PATTERN_CONFLICTS: Record<string, StrengthPattern[]> = {
  shoulder: ["vertical_press"],
  shoulder_right: ["vertical_press"],
  shoulder_left: ["vertical_press"],
  lower_back: ["hinge"],
  knee: ["squat"],
  elbow: ["horizontal_press", "isolation"],
  wrist: ["horizontal_press"],
};

/** Which of the user's active injuries this exercise's movement pattern
 *  conflicts with — same table the recommender uses to filter, exposed so
 *  manual exercise pickers can warn instead of silently excluding. */
export function conflictingInjuries(exercise: Pick<Exercise, "pattern">, activeInjuries: Injury[]): Injury[] {
  return activeInjuries.filter((injury) => (INJURY_PATTERN_CONFLICTS[injury.area] ?? []).includes(exercise.pattern));
}

export interface Recommendation {
  exercise: Exercise;
  reason: string;
}

/**
 * Lightweight, explainable recommender: filters by available equipment and
 * active-injury conflicts, then ranks by which muscle groups have been
 * trained least in the last 8 weeks. Every suggestion carries a one-line
 * "why" so it never feels like an arbitrary black box.
 */
export async function recommendExercises(limit = 5): Promise<Recommendation[]> {
  const [profile, injuries, exercises] = await Promise.all([getProfile(), listInjuries(), listExercises()]);
  const activeInjuries = injuries.filter((i) => i.active);
  const equipmentAvailable = new Set(profile?.equipmentAvailable ?? []);

  const conflictingPatterns = new Set<StrengthPattern>();
  for (const injury of activeInjuries) {
    for (const pattern of INJURY_PATTERN_CONFLICTS[injury.area] ?? []) conflictingPatterns.add(pattern);
  }

  const eligible = exercises.filter((e) => {
    if (equipmentAvailable.size > 0 && !e.equipment.some((eq) => equipmentAvailable.has(eq))) return false;
    if (conflictingPatterns.has(e.pattern)) return false;
    return true;
  });

  const scored: (Recommendation & { freq: number })[] = [];
  for (const exercise of eligible) {
    const sets = await getSetsForExercise(exercise.id);
    const freq = weeklyFrequency(sets, 8);
    let reason = "Encaja con tu equipamiento disponible";
    if (freq === 0) reason = "Todavía no lo has entrenado — buena forma de sumar variedad";
    else if (freq < 0.5) reason = "Llevas este grupo muscular más atrasado que el resto";
    scored.push({ exercise, reason, freq });
  }

  scored.sort((a, b) => a.freq - b.freq || Number(b.exercise.isFavorite) - Number(a.exercise.isFavorite));

  return scored.slice(0, limit).map(({ exercise, reason }) => ({ exercise, reason }));
}
