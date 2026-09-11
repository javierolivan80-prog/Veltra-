"use client";

import { useQuery } from "@tanstack/react-query";
import { todayKey } from "@/lib/date";
import { computeInsights } from "./signals";

/** Recalcula una vez al día — cruzar sueño/ánimo/actividad no es barato y el
 *  patrón no cambia entre una carga de Hoy y la siguiente en el mismo día. */
export function useInsights() {
  return useQuery({
    queryKey: ["insights", todayKey()],
    queryFn: computeInsights,
    staleTime: 60 * 60 * 1000,
  });
}
