"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPersonalRecords, listRecentPRs } from "./prs";
import { recommendExercises } from "./recommend";
import * as repo from "./repo";
import type { ExerciseInput } from "./repo";

export const exerciseKeys = {
  all: ["exercises"] as const,
  list: () => [...exerciseKeys.all, "list"] as const,
  favorites: () => [...exerciseKeys.all, "favorites"] as const,
  detail: (id: string) => [...exerciseKeys.all, "detail", id] as const,
  search: (q: string) => [...exerciseKeys.all, "search", q] as const,
};

export function useExercises() {
  return useQuery({ queryKey: exerciseKeys.list(), queryFn: repo.listExercises });
}

export function useFavoriteExercises() {
  return useQuery({ queryKey: exerciseKeys.favorites(), queryFn: repo.listFavoriteExercises });
}

export function useExercise(id: string | null) {
  return useQuery({ queryKey: exerciseKeys.detail(id ?? ""), queryFn: () => repo.getExercise(id!), enabled: !!id });
}

export function useSearchExercises(query: string) {
  return useQuery({ queryKey: exerciseKeys.search(query), queryFn: () => repo.searchExercises(query), enabled: query.length > 0 });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExerciseInput) => repo.createExercise(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExerciseInput> }) => repo.updateExercise(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function useDuplicateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.duplicateExercise(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteExercise(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function usePersonalRecords(exerciseId: string | null) {
  return useQuery({
    queryKey: [...exerciseKeys.detail(exerciseId ?? ""), "prs"],
    queryFn: () => listPersonalRecords(exerciseId!),
    enabled: !!exerciseId,
  });
}

export function useRecentPRs(limit = 10) {
  return useQuery({ queryKey: [...exerciseKeys.all, "recentPRs", limit], queryFn: () => listRecentPRs(limit) });
}

export function useRecommendedExercises(limit = 5) {
  return useQuery({ queryKey: [...exerciseKeys.all, "recommended", limit], queryFn: () => recommendExercises(limit) });
}
