"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todayKey } from "@/lib/date";
import * as repo from "./repo";
import type { HabitInput } from "./repo";
import type { HabitLogStatus } from "@/types/models";

export const habitKeys = {
  all: ["habits"] as const,
  list: () => [...habitKeys.all, "list"] as const,
  detail: (id: string) => [...habitKeys.all, "detail", id] as const,
  logs: (id: string) => [...habitKeys.all, "logs", id] as const,
  today: () => [...habitKeys.all, "today", todayKey()] as const,
};

export function useHabits() {
  return useQuery({ queryKey: habitKeys.list(), queryFn: repo.listHabits });
}

export function useHabit(id: string | null) {
  return useQuery({ queryKey: habitKeys.detail(id ?? ""), queryFn: () => repo.getHabit(id!), enabled: !!id });
}

export function useHabitLogs(habitId: string | null) {
  return useQuery({ queryKey: habitKeys.logs(habitId ?? ""), queryFn: () => repo.listHabitLogs(habitId!), enabled: !!habitId });
}

export function useTodayHabitLogs() {
  return useQuery({ queryKey: habitKeys.today(), queryFn: () => repo.listHabitLogsForDate(todayKey()) });
}

export function useAllHabitLogs() {
  return useQuery({ queryKey: [...habitKeys.all, "allLogs"] as const, queryFn: repo.listAllHabitLogs });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HabitInput) => repo.createHabit(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<HabitInput> }) => repo.updateHabit(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useLogHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date, status }: { habitId: string; date: string; status: HabitLogStatus }) => repo.logHabit(habitId, date, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}
