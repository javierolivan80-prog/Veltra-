"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyGospel } from "@/app/api/gospel/route";
import * as repo from "./repo";
import type { FaithCheckInPatch } from "./repo";

export const faithKeys = {
  all: ["faithCheckins"] as const,
  list: () => [...faithKeys.all, "list"] as const,
  byDate: (date: string) => [...faithKeys.all, "byDate", date] as const,
};

export function useFaithCheckIns() {
  return useQuery({ queryKey: faithKeys.list(), queryFn: repo.listFaithCheckIns });
}

export function useFaithCheckInByDate(date: string) {
  return useQuery({ queryKey: faithKeys.byDate(date), queryFn: () => repo.getFaithCheckInByDate(date) });
}

export function useUpsertFaithCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, patch }: { date: string; patch: FaithCheckInPatch }) => repo.upsertFaithCheckIn(date, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: faithKeys.all }),
  });
}

/** Mismo contenido para todo el mundo — una petición cada varias horas
 *  basta, la ruta ya lo cachea en el servidor por su cuenta. */
export function useDailyGospel() {
  return useQuery({
    queryKey: ["dailyGospel"],
    queryFn: async (): Promise<DailyGospel | null> => {
      const res = await fetch("/api/gospel");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
