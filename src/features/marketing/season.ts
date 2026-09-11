// Campaña estacional de la landing — Fase 4 de la auditoría: el Contrato ya
// es, mecánicamente, un "Winter Arc" (arco con fecha de fin y un "por qué").
// Esto no le añade nada al motor (contract/repo.ts sigue exactamente igual):
// solo cambia cómo se presenta la misma mecánica en la puerta pública de la
// app durante la temporada real en la que ese encuadre tiene sentido —
// noviembre a febrero, cuando "empezar de cero antes de que acabe el año" es
// una búsqueda real, no un adorno de marketing fuera de contexto en julio.

const WINTER_ARC_MONTHS = new Set([10, 11, 0, 1]); // nov, dic, ene, feb (Date#getMonth() es 0-indexado)

export function isWinterArcSeason(date: Date = new Date()): boolean {
  return WINTER_ARC_MONTHS.has(date.getMonth());
}
