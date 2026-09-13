import { shiftDayKey, todayKey } from "@/lib/date";
import type { Commitment } from "@/types/models";
import type { DoneDaysByKind } from "./adaptive";
import { commitmentsForDay } from "./arc";

/**
 * Días seguidos cumpliendo el plan entero, contando hacia atrás desde
 * `referenceDate` y sin pasar de `floorDate` (el inicio del contrato).
 *
 * Un día sin nada programado no suma ni rompe la racha: no se puede fallar
 * lo que no tocaba, y contarlo como fallo castigaría justo los días de
 * descanso que el propio plan reserva.
 *
 * Los compromisos de tipo "habit" quedan fuera porque desde aquí no hay
 * forma de saber si se marcaron — mismo motivo por el que detectAutoReductions
 * ya los salta.
 */
export function computePlanStreak(
  commitments: Commitment[],
  doneDaysByKind: DoneDaysByKind,
  floorDate: string,
  referenceDate: string = todayKey()
): number {
  let streak = 0;
  let cursor = referenceDate;

  while (cursor >= floorDate) {
    const due = commitmentsForDay(commitments, cursor).filter((c) => c.kind !== "habit");
    if (due.length > 0) {
      if (!due.every((c) => doneDaysByKind[c.kind]?.has(cursor))) break;
      streak++;
    }
    cursor = shiftDayKey(cursor, -1);
  }

  return streak;
}
