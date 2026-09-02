import type { Exercise, SetEntry } from "@/types/models";

/** Epley formula — the industry-standard estimated-1RM approximation. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function isBodyweightLoaded(exercise: Pick<Exercise, "equipment">): boolean {
  return exercise.equipment.includes("bodyweight");
}

/**
 * For bodyweight-loaded movements (pull-ups, dips…) `weightKg` on a set is the
 * *added* load, not the total moved — bodyweight has to be folded back in or
 * 1RM/volume trends flatline at zero even as the lifter genuinely progresses.
 */
export function effectiveWeight(exercise: Pick<Exercise, "equipment">, weightKg: number, bodyweightKg: number | null): number {
  if (isBodyweightLoaded(exercise) && bodyweightKg) return bodyweightKg + weightKg;
  return weightKg;
}

export function estimatedOneRepMax(exercise: Pick<Exercise, "equipment">, weightKg: number, reps: number, bodyweightKg: number | null): number {
  return epley1RM(effectiveWeight(exercise, weightKg, bodyweightKg), reps);
}

export interface SessionPoint {
  sessionId: string;
  date: string;
  value: number;
}

function groupBySession(sets: SetEntry[]): Map<string, SetEntry[]> {
  const map = new Map<string, SetEntry[]>();
  for (const set of sets) {
    const list = map.get(set.sessionId) ?? [];
    list.push(set);
    map.set(set.sessionId, list);
  }
  return map;
}

function sortByDate(points: SessionPoint[]): SessionPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

export function weightSeries(sets: SetEntry[]): SessionPoint[] {
  const grouped = groupBySession(sets);
  const points: SessionPoint[] = [];
  for (const [sessionId, sessionSets] of grouped) {
    const best = Math.max(...sessionSets.map((s) => s.weightKg));
    points.push({ sessionId, date: sessionSets[0].completedAt, value: best });
  }
  return sortByDate(points);
}

export function oneRmSeries(sets: SetEntry[], exercise: Pick<Exercise, "equipment">, bodyweightKg: number | null): SessionPoint[] {
  const grouped = groupBySession(sets);
  const points: SessionPoint[] = [];
  for (const [sessionId, sessionSets] of grouped) {
    const best = Math.max(...sessionSets.map((s) => estimatedOneRepMax(exercise, s.weightKg, s.reps, bodyweightKg)));
    points.push({ sessionId, date: sessionSets[0].completedAt, value: Math.round(best * 10) / 10 });
  }
  return sortByDate(points);
}

export function repsSeries(sets: SetEntry[]): SessionPoint[] {
  const grouped = groupBySession(sets);
  const points: SessionPoint[] = [];
  for (const [sessionId, sessionSets] of grouped) {
    const best = Math.max(...sessionSets.map((s) => s.reps));
    points.push({ sessionId, date: sessionSets[0].completedAt, value: best });
  }
  return sortByDate(points);
}

export function weeklyFrequency(sets: SetEntry[], weeks = 12): number {
  const grouped = groupBySession(sets);
  const cutoff = Date.now() - weeks * 7 * 86400000;
  const sessionDates = [...grouped.values()].map((s) => new Date(s[0].completedAt).getTime()).filter((t) => t >= cutoff);
  if (sessionDates.length === 0) return 0;
  return Math.round((sessionDates.length / weeks) * 10) / 10;
}

/** Naive least-squares trend, projected `periodsAhead` sessions into the future. Used for the "predicted progress" line. */
export function linearPrediction(series: SessionPoint[], periodsAhead = 3): number | null {
  if (series.length < 3) return null;
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.value);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = yMean - slope * xMean;
  const predicted = intercept + slope * (n - 1 + periodsAhead);
  return Math.max(0, Math.round(predicted * 10) / 10);
}

export function totalTrainingMinutes(sets: SetEntry[]): number {
  // No per-exercise timer is kept — approximate from set count using a
  // typical working-set-plus-rest cadence (~2.5 min/set across compounds and isolation).
  return Math.round(sets.length * 2.5);
}
