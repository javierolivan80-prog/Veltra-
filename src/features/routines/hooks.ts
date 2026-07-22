import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { RoutineInput } from "./repo";

export const routineKeys = {
  all: ["routines"] as const,
  list: () => [...routineKeys.all, "list"] as const,
  detail: (id: string) => [...routineKeys.all, "detail", id] as const,
};

export function useRoutines() {
  return useQuery({ queryKey: routineKeys.list(), queryFn: repo.listRoutines });
}

export function useRoutine(id: string | null) {
  return useQuery({ queryKey: routineKeys.detail(id ?? ""), queryFn: () => repo.getRoutine(id!), enabled: !!id });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoutineInput) => repo.createRoutine(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: routineKeys.all }),
  });
}

export function useUpdateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoutineInput }) => repo.updateRoutine(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: routineKeys.all }),
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteRoutine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: routineKeys.all }),
  });
}
