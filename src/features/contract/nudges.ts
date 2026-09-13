import type { Commitment } from "@/types/models";
import { trailingMissStreak, type DoneDaysByKind } from "./adaptive";

export interface MotivationalNudge {
  commitmentId: string;
  title: string;
  missStreak: number;
  message: string;
}

/**
 * Un aviso el día en que un compromiso está a punto de dispararse la
 * reducción automática (detectAutoReductions en adaptive.ts corta a los 3
 * fallos seguidos) — esto avisa un día antes, cuando lleva 2, para intentar
 * salvar el día en vez de descubrir el ajuste después de que ya ocurrió.
 * Los hábitos propios quedan fuera: ya tienen su aviso a las 20:30
 * (send-streak-nudges) y avisar dos veces por lo mismo sería ruido.
 */
export function buildMotivationalNudges(commitmentsToday: Commitment[], doneDaysByKind: DoneDaysByKind, today: string, why: string | null): MotivationalNudge[] {
  const nudges: MotivationalNudge[] = [];
  for (const c of commitmentsToday) {
    if (c.kind === "habit") continue;
    const doneDays = doneDaysByKind[c.kind] ?? new Set<string>();
    if (doneDays.has(today)) continue;
    const missStreak = trailingMissStreak(c, doneDays, today);
    if (missStreak !== 2) continue;

    const message = why
      ? `Llevas 2 días sin "${c.title}". Si hoy también falla, bajamos la frecuencia. Tú dijiste: "${why}"`
      : `Llevas 2 días sin "${c.title}". Si hoy también falla, bajamos la frecuencia.`;

    nudges.push({ commitmentId: c.id, title: c.title, missStreak, message });
  }
  return nudges;
}
