"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todayKey } from "@/lib/date";
import * as repo from "./repo";

export const screenTimeKeys = {
  all: ["screenTimeLogs"] as const,
  byDate: (date: string) => [...screenTimeKeys.all, "date", date] as const,
  today: () => screenTimeKeys.byDate(todayKey()),
};

export function useScreenTimeLogs() {
  return useQuery({ queryKey: screenTimeKeys.all, queryFn: repo.listScreenTimeLogs });
}

export function useScreenTimeByDate(date: string) {
  return useQuery({ queryKey: screenTimeKeys.byDate(date), queryFn: () => repo.getScreenTimeByDate(date) });
}

export function useUpsertScreenTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, hours }: { date: string; hours: number }) => repo.upsertScreenTimeLog(date, hours),
    onSuccess: () => qc.invalidateQueries({ queryKey: screenTimeKeys.all }),
  });
}
