"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { SleepLogInput } from "./repo";

export const sleepKeys = {
  all: ["sleep"] as const,
  list: () => [...sleepKeys.all, "list"] as const,
  byDate: (date: string) => [...sleepKeys.all, "byDate", date] as const,
};

export function useSleepLogs() {
  return useQuery({ queryKey: sleepKeys.list(), queryFn: repo.listSleepLogs });
}

export function useSleepLogByDate(date: string) {
  return useQuery({ queryKey: sleepKeys.byDate(date), queryFn: () => repo.getSleepLogByDate(date) });
}

export function useUpsertSleepLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SleepLogInput) => repo.upsertSleepLog(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sleepKeys.all }),
  });
}

export function useDeleteSleepLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteSleepLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: sleepKeys.all }),
  });
}
