import { shiftDayKey, todayKey } from "@/lib/date";
import type { HabitLog } from "@/types/models";

/** "Saltado" neither breaks nor extends a streak; a day with no entry at all
 *  (missed) breaks it. Today counts only once answered. */
export function computeStreaks(logs: HabitLog[]): { current: number; longest: number } {
  if (logs.length === 0) return { current: 0, longest: 0 };
  const byDate = new Map(logs.map((l) => [l.date, l.status]));
  const firstDate = logs.reduce((min, l) => (l.date < min ? l.date : min), logs[0].date);

  let current = 0;
  let cursor = todayKey();
  // Today doesn't break the streak just because it hasn't been answered yet.
  if (!byDate.has(cursor)) cursor = shiftDayKey(cursor, -1);
  while (cursor >= firstDate) {
    const status = byDate.get(cursor);
    if (status === "done") current++;
    else if (status === "skipped") {
      /* neutral — keep walking back without incrementing */
    } else break;
    cursor = shiftDayKey(cursor, -1);
  }

  let longest = 0;
  let running = 0;
  cursor = firstDate;
  const end = todayKey();
  while (cursor <= end) {
    const status = byDate.get(cursor);
    if (status === "done") {
      running++;
      longest = Math.max(longest, running);
    } else if (status !== "skipped") {
      running = 0;
    }
    cursor = shiftDayKey(cursor, 1);
  }

  return { current, longest };
}

/** % of days completed over the last `days` (or since the habit's first log
 *  if younger than that window). */
export function computeCompletionRate(logs: HabitLog[], days = 30): number {
  if (logs.length === 0) return 0;
  const firstDate = logs.reduce((min, l) => (l.date < min ? l.date : min), logs[0].date);
  const windowStart = shiftDayKey(todayKey(), -(days - 1));
  const start = firstDate > windowStart ? firstDate : windowStart;
  const totalDays = Math.round((dateFromKey(todayKey()).getTime() - dateFromKey(start).getTime()) / 86400000) + 1;
  const doneCount = logs.filter((l) => l.date >= start && l.status === "done").length;
  return totalDays > 0 ? doneCount / totalDays : 0;
}

export function totalCompleted(logs: HabitLog[]): number {
  return logs.filter((l) => l.status === "done").length;
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
