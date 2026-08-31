import type { Addiction, AddictionRelapse } from "@/types/models";

/** Chronological event times that bound each streak: the tracking start,
 *  then every relapse, oldest first. */
function eventTimestamps(addiction: Addiction, relapses: AddictionRelapse[]): number[] {
  const sorted = [...relapses].sort((a, b) => a.fallenAt.localeCompare(b.fallenAt));
  return [new Date(addiction.startDate).getTime(), ...sorted.map((r) => new Date(r.fallenAt).getTime())];
}

/** When the *current* streak began — the most recent relapse, or the
 *  tracking start date if there's none yet. */
export function currentStreakStartMs(addiction: Addiction, relapses: AddictionRelapse[]): number {
  const events = eventTimestamps(addiction, relapses);
  return events[events.length - 1];
}

/** Longest gap between consecutive events, including the ongoing streak. */
export function longestStreakMs(addiction: Addiction, relapses: AddictionRelapse[]): number {
  const events = [...eventTimestamps(addiction, relapses), Date.now()];
  let longest = 0;
  for (let i = 1; i < events.length; i++) longest = Math.max(longest, events[i] - events[i - 1]);
  return longest;
}

/** Average gap between relapses, in days — needs at least 2 relapses. */
export function avgDaysBetweenRelapses(relapses: AddictionRelapse[]): number | null {
  if (relapses.length < 2) return null;
  const sorted = [...relapses].sort((a, b) => a.fallenAt.localeCompare(b.fallenAt));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((new Date(sorted[i].fallenAt).getTime() - new Date(sorted[i - 1].fallenAt).getTime()) / 86400000);
  }
  return gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
}

export type Trend = "improving" | "worsening" | "stable" | "not_enough_data";

/** Compares the ongoing streak against the average of every completed gap
 *  before it — longer than average reads as improving. */
export function computeTrend(addiction: Addiction, relapses: AddictionRelapse[]): Trend {
  const events = eventTimestamps(addiction, relapses);
  if (events.length < 2) return "not_enough_data";
  const priorGaps: number[] = [];
  for (let i = 1; i < events.length; i++) priorGaps.push(events[i] - events[i - 1]);
  const avgPrior = priorGaps.reduce((sum, g) => sum + g, 0) / priorGaps.length;
  const ongoing = Date.now() - events[events.length - 1];
  const ratio = avgPrior > 0 ? ongoing / avgPrior : 1;
  if (ratio > 1.1) return "improving";
  if (ratio < 0.9) return "worsening";
  return "stable";
}
