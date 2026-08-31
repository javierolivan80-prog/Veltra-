"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { LifeGoalInput } from "./repo";

export const goalKeys = {
  all: ["goals"] as const,
  detail: (id: string) => [...goalKeys.all, "detail", id] as const,
  checkpoints: (goalId: string) => [...goalKeys.all, "checkpoints", goalId] as const,
};

export function useGoals() {
  return useQuery({ queryKey: goalKeys.all, queryFn: repo.listGoals });
}

export function useGoal(id: string | null) {
  return useQuery({ queryKey: goalKeys.detail(id ?? ""), queryFn: () => repo.getGoal(id!), enabled: !!id });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LifeGoalInput) => repo.createGoal(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useCheckpoints(goalId: string | null) {
  return useQuery({ queryKey: goalKeys.checkpoints(goalId ?? ""), queryFn: () => repo.listCheckpoints(goalId!), enabled: !!goalId });
}

export function useAddCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, name, position }: { goalId: string; name: string; position: number }) => repo.addCheckpoint(goalId, name, position),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: goalKeys.checkpoints(variables.goalId) }),
  });
}

export function useToggleCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; goalId: string }) => repo.toggleCheckpoint(id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: goalKeys.checkpoints(variables.goalId) }),
  });
}

export function useDeleteCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; goalId: string }) => repo.deleteCheckpoint(id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: goalKeys.checkpoints(variables.goalId) }),
  });
}
