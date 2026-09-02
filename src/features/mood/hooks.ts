"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todayKey } from "@/lib/date";
import * as repo from "./repo";
import type { MoodOption } from "@/types/models";

export const moodKeys = {
  all: ["dailyMoods"] as const,
  byDate: (date: string) => [...moodKeys.all, "byDate", date] as const,
  today: () => moodKeys.byDate(todayKey()),
};

export function useDailyMoods() {
  return useQuery({ queryKey: moodKeys.all, queryFn: repo.listDailyMoods });
}

export function useDailyMoodByDate(date: string) {
  return useQuery({ queryKey: moodKeys.byDate(date), queryFn: () => repo.getDailyMoodByDate(date) });
}

export function useUpsertDailyMood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, mood }: { date: string; mood: MoodOption }) => repo.upsertDailyMood(date, mood),
    retry: 2,
    retryDelay: 1000,
    onSuccess: () => qc.invalidateQueries({ queryKey: moodKeys.all }),
  });
}
