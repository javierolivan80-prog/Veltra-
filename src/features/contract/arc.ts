import { daysBetweenDayKeys, todayKey } from "@/lib/date";
import { SLOT_ORDER } from "./catalogue";
import type { Commitment, Contract } from "@/types/models";

/** Qué día del arco es hoy, empezando en 1. Se recorta a los extremos: antes
 *  de firmar no hay día 0, y después de terminar el arco no sigue creciendo. */
export function dayOfArc(contract: Contract, today: string = todayKey()): number {
  const elapsed = daysBetweenDayKeys(contract.startedOn, today) + 1;
  return Math.min(contract.durationDays, Math.max(1, elapsed));
}

/** Días que quedan, hoy incluido. Cero cuando el arco ya ha terminado. */
export function daysLeft(contract: Contract, today: string = todayKey()): number {
  return Math.max(0, daysBetweenDayKeys(today, contract.endsOn) + 1);
}

export function isArcOver(contract: Contract, today: string = todayKey()): boolean {
  return daysBetweenDayKeys(today, contract.endsOn) < 0;
}

/** Los compromisos que tocan hoy, en el orden en que transcurre el día. */
export function commitmentsForDay(commitments: Commitment[], date: string = todayKey()): Commitment[] {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return commitments
    .filter((c) => c.days.includes(weekday))
    .sort((a, b) => SLOT_ORDER[a.timeSlot] - SLOT_ORDER[b.timeSlot] || a.position - b.position);
}
