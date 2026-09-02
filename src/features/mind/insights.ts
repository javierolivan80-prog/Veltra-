import { shiftDayKey, todayKey } from "@/lib/date";

export interface DailyTrackable {
  name: string;
  /** Day keys (YYYY-MM-DD) on which this was completed. */
  doneDates: Set<string>;
}

/**
 * Short, deterministic coaching tip for the Mente checklist — no LLM call,
 * just pattern-matching over the same done/not-done data the checklist
 * already renders. Prioritizes calling out a 2-day miss (the most
 * actionable signal) over a generic pat on the back.
 */
export function buildMenteInsight(trackables: DailyTrackable[]): string {
  if (trackables.length === 0) return "Añade un hábito para que empiece a analizar tu constancia aquí.";

  const yesterday = shiftDayKey(todayKey(), -1);
  const dayBefore = shiftDayKey(todayKey(), -2);
  const missedBoth = trackables.filter((t) => !t.doneDates.has(yesterday) && !t.doneDates.has(dayBefore));

  if (missedBoth.length === 1) {
    return `${missedBoth[0].name} es lo único que fallas dos días seguidos. Prueba a ligarlo a algo que ya haces siempre, como justo después de cenar.`;
  }
  if (missedBoth.length > 1) {
    return `Llevas dos días seguidos sin ${missedBoth.map((t) => t.name.toLowerCase()).join(" ni ")}. Elige uno para retomar hoy — no hace falta todo a la vez.`;
  }

  const doneToday = trackables.filter((t) => t.doneDates.has(todayKey())).length;
  if (doneToday === trackables.length) {
    return "Llevas todo hecho hoy. Vas muy bien — mantén el ritmo.";
  }
  return "Vas cumpliendo con constancia esta semana. Sigue así.";
}
