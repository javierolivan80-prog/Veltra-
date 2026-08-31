import { shiftDayKey, todayKey } from "@/lib/date";
import type { AddictionRelapse, HabitLog, SleepLog } from "@/types/models";

/** Días consecutivos "productivos" (terminando hoy o ayer), donde un día
 *  cuenta como productivo si: ningún hábito se marcó `not_done`, hay un
 *  registro de sueño esa noche, y no hubo ninguna caída ese día. Mismo
 *  algoritmo de recorrido que habits/stats.ts:computeStreaks. */
export function computeCombinedStreak(habitLogs: HabitLog[], sleepLogs: SleepLog[], relapses: AddictionRelapse[]): number {
  const sleepDates = new Set(sleepLogs.map((l) => l.date));
  const relapseDates = new Set(relapses.map((r) => r.fallenAt.slice(0, 10)));
  const notDoneDates = new Set(habitLogs.filter((l) => l.status === "not_done").map((l) => l.date));

  const allDates = [...sleepDates, ...habitLogs.map((l) => l.date)];
  if (allDates.length === 0) return 0;
  const firstDate = allDates.reduce((min, d) => (d < min ? d : min), allDates[0]);

  let streak = 0;
  let cursor = todayKey();
  // Today doesn't break the streak just because it hasn't fully happened yet.
  if (!sleepDates.has(cursor) && !habitLogs.some((l) => l.date === cursor)) cursor = shiftDayKey(cursor, -1);

  while (cursor >= firstDate) {
    const productive = sleepDates.has(cursor) && !notDoneDates.has(cursor) && !relapseDates.has(cursor);
    if (!productive) break;
    streak++;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}
