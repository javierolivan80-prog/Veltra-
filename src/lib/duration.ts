// Shared duration math for Sueño and Adicciones — pure functions, no IO.

/** "HH:MM" → minutes since midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes from `fromHHMM` to `toHHMM`, assuming `to` rolled past midnight
 *  whenever it's numerically earlier than `from` (e.g. bed 23:30 → asleep
 *  00:15 is 45 minutes, not negative). */
export function diffMinutesRolloverAware(fromHHMM: string, toHHMM: string): number {
  const from = timeToMinutes(fromHHMM);
  const to = timeToMinutes(toHHMM);
  return to >= from ? to - from : to + 24 * 60 - from;
}

/** e.g. 510 → "8h 30m", 45 → "45m", 480 → "8h". */
export function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** e.g. 4,082,000 ms → "47 días, 3 horas y 22 minutos". Drops the days/hours
 *  segment entirely once it's zero rather than showing "0 días". */
export function formatElapsedLong(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "menos de un minuto";

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} día${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hora${hours === 1 ? "" : "s"}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minuto${minutes === 1 ? "" : "s"}`);

  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}
