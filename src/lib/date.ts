/** Local calendar-day helpers shared by Hábitos, Sueño y Adicciones. Days are
 *  keyed YYYY-MM-DD in the user's own timezone, so "today" flips at local
 *  midnight, not UTC. */

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return dayKey();
}

/** Human label for a day key — "Hoy" / "Ayer" / "12 de julio". */
export function dayLabel(key: string): string {
  if (key === todayKey()) return "Hoy";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return "Ayer";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

/** `key` shifted by `deltaDays` (negative goes back). */
export function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return dayKey(date);
}

/** The last `n` day keys, oldest first, ending at `endKey` (default today). */
export function lastNDayKeys(n: number, endKey: string = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => shiftDayKey(endKey, -(n - 1 - i)));
}

const WEEKDAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** ISO-8601 week number (1-53), Monday as the first day of the week. */
export function isoWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** "Lunes 31 · Semana 36" — the kicker shown atop "Hoy". */
export function todayKicker(date: Date = new Date()): string {
  return `${WEEKDAY_NAMES_ES[date.getDay()]} ${date.getDate()} · Semana ${isoWeekNumber(date)}`;
}
