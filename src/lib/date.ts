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

/** Days-consecutive streak ending today (or yesterday if today has no entry
 *  yet — today alone never breaks a streak) from a flat list of day keys.
 *  Duplicates and order don't matter. */
export function computeDayStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates);
  let cursor = todayKey();
  if (!days.has(cursor)) cursor = shiftDayKey(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
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

const MONTH_NAMES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "Lunes 31 de agosto" — the subtitle under the "Hoy" title. */
export function todayFullLabel(date: Date = new Date()): string {
  return `${WEEKDAY_NAMES_ES[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES_ES[date.getMonth()]}`;
}

/** First day-key (YYYY-MM-01) of the calendar month *before* the one
 *  containing `referenceDate` — i.e. the most recently *completed* month,
 *  the one a monthly review can talk about in full. */
export function previousMonthStart(referenceDate: string = todayKey()): string {
  const [y, m] = referenceDate.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return dayKey(date);
}

/** Last day-key of the calendar month that `monthStartKey` (YYYY-MM-01) opens. */
export function monthEndKey(monthStartKey: string): string {
  const [y, m] = monthStartKey.split("-").map(Number);
  return dayKey(new Date(y, m, 0));
}

/** "agosto 2026" — label for a monthStart day-key. */
export function monthLabel(monthStartKey: string): string {
  const [y, m] = monthStartKey.split("-").map(Number);
  return `${MONTH_NAMES_ES[m - 1]} ${y}`;
}

/** Días naturales de `from` a `to`, ambos claves de día locales. Negativo si
 *  `to` es anterior. Se redondea porque un cambio de hora mete ±1 h en la
 *  resta y convertiría 30 días exactos en 29,96. */
export function daysBetweenDayKeys(from: string, to: string): number {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return Math.round((parse(to) - parse(from)) / 86400000);
}
