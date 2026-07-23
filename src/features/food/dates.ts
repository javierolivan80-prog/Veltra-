/** Local calendar-day helpers for Veltra Food. Days are keyed YYYY-MM-DD in
 *  the user's own timezone, so "today" flips at local midnight, not UTC. */

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
