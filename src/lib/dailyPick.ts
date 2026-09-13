/** Elemento fijo para un día concreto: el mismo durante toda la jornada y
 *  distinto al siguiente. Rota en orden en vez de sortear, para que no salga
 *  dos días seguidos lo mismo por azar. `offset` desacopla dos listas que se
 *  muestran juntas y si no avanzarían al unísono. */
export function pickForDay<T>(items: readonly T[], dayKey: string, offset = 0): T {
  const [y, m, d] = dayKey.split("-").map(Number);
  const daysSinceEpoch = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return items[(daysSinceEpoch + offset) % items.length];
}
