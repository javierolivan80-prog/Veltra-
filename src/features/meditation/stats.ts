import { shiftDayKey, todayKey } from "@/lib/date";
import type { MeditationSession } from "@/types/models";

function dayKeyOf(iso: string): string {
  return iso.slice(0, 10) === iso ? iso : new Date(iso).toISOString().slice(0, 10);
}

/** Días consecutivos con al menos una sesión, terminando hoy (o ayer si hoy
 *  todavía no hay sesión — como en habits/stats.ts, hoy no rompe la racha). */
export function computeMeditationStreak(sessions: MeditationSession[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => dayKeyOf(s.completedAt)));
  let cursor = todayKey();
  if (!days.has(cursor)) cursor = shiftDayKey(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

export function totalMinutes(sessions: MeditationSession[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
}
