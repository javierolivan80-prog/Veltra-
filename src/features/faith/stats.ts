import type { FaithCheckIn } from "@/types/models";

/** Cuántas de las cuatro cosas del día están hechas (0-4). El examen cuenta
 *  por haberlo escrito, no por su longitud. */
export function faithDoneCount(checkIn: FaithCheckIn | null | undefined): number {
  if (!checkIn) return 0;
  return (checkIn.mass ? 1 : 0) + (checkIn.rosary ? 1 : 0) + (checkIn.prayer ? 1 : 0) + (checkIn.examen ? 1 : 0);
}

/** Como compromiso del contrato, el día cuenta con que haya al menos una de
 *  las cuatro — el mismo criterio que nutrición (una comida) o journaling
 *  (una entrada): el compromiso es no dejar el día en blanco, no hacer pleno. */
export function faithDoneDays(checkIns: FaithCheckIn[]): Set<string> {
  return new Set(checkIns.filter((c) => faithDoneCount(c) > 0).map((c) => c.date));
}
