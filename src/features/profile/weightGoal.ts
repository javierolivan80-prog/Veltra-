import type { BodyWeightLog } from "@/types/models";

export interface WeightGoalEta {
  etaDate: string; // ISO date
  daysRemaining: number;
  kgPerWeek: number;
}

/** Least-squares slope of weight vs. day-offset (kg per day). */
function slopePerDay(logs: BodyWeightLog[]): number | null {
  if (logs.length < 3) return null;
  const t0 = new Date(logs[0].date).getTime();
  const xs = logs.map((l) => (new Date(l.date).getTime() - t0) / 86400000);
  const ys = logs.map((l) => l.weightKg);
  const n = logs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

/**
 * Projects when the current weight trend (last 30 days, so an old plateau
 * doesn't drag down a trend that just restarted) would reach the goal.
 * Returns null whenever there isn't a real trend to project — too little
 * data, a flat trend, or one moving away from the goal — rather than
 * showing a misleading date.
 */
export function estimateWeightGoalEta(allLogs: BodyWeightLog[], targetWeightKg: number, currentWeightKg: number): WeightGoalEta | null {
  const sorted = [...allLogs].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = Date.now() - 30 * 86400000;
  const recent = sorted.filter((l) => new Date(l.date).getTime() >= cutoff);
  const window = recent.length >= 3 ? recent : sorted;

  const slope = slopePerDay(window);
  if (slope === null || slope === 0) return null;

  const remainingKg = targetWeightKg - currentWeightKg;
  // Trend must move toward the goal, not away from it.
  if (Math.sign(remainingKg) !== Math.sign(slope)) return null;

  const daysRemaining = Math.round(remainingKg / slope);
  if (daysRemaining <= 0 || daysRemaining > 3 * 365) return null;

  const etaDate = new Date(Date.now() + daysRemaining * 86400000).toISOString().slice(0, 10);
  return { etaDate, daysRemaining, kgPerWeek: Math.round(slope * 7 * 100) / 100 };
}
