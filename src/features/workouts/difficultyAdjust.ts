import type { SetEntry } from "@/types/models";

/** All sets for one exercise, restricted to whichever past session (not the
 *  current one) most recently logged it. */
export function lastSessionSetsFor(allSetsForExercise: SetEntry[], currentSessionId: string): SetEntry[] {
  const past = allSetsForExercise.filter((s) => s.sessionId !== currentSessionId);
  if (past.length === 0) return [];
  const lastSessionId = [...past].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0].sessionId;
  return past.filter((s) => s.sessionId === lastSessionId);
}

export type WeightAdjustDirection = "increase" | "decrease" | "maintain";

export interface WeightAdjustSuggestion {
  direction: WeightAdjustDirection;
  message: string;
}

/**
 * Reads only the last session where this exercise was logged — not the
 * whole history — because difficulty auto-adjust must react to what just
 * happened, not get diluted by sets from a month ago.
 */
export function suggestWeightAdjustment(lastSessionSets: SetEntry[], targetRepsMin: number, targetRepsMax: number): WeightAdjustSuggestion | null {
  const working = lastSessionSets.filter((s) => !s.isWarmup);
  if (working.length === 0) return null;

  const missedRange = working.some((s) => s.reps < targetRepsMin);
  const ratedSets = working.filter((s) => s.rir !== null);
  const allEasy = ratedSets.length === working.length && ratedSets.every((s) => (s.rir as number) >= 3);
  const hitTopOfRange = working.every((s) => s.reps >= targetRepsMax);

  if (missedRange) {
    return { direction: "decrease", message: "La última vez no llegaste al rango de reps — prueba a bajar el peso hoy." };
  }
  if (allEasy && hitTopOfRange) {
    return { direction: "increase", message: "La última vez te quedó margen de sobra en todas las series — prueba a subir el peso hoy." };
  }
  const allFailure = ratedSets.length === working.length && ratedSets.every((s) => (s.rir as number) === 0);
  if (allFailure) {
    return { direction: "maintain", message: "Fuiste al fallo en todas las series — mantén el peso y busca cerrar el rango de reps." };
  }
  return null;
}
