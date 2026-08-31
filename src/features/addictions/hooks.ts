"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { AddictionInput } from "./repo";

export const addictionKeys = {
  all: ["addictions"] as const,
  list: () => [...addictionKeys.all, "list"] as const,
  detail: (id: string) => [...addictionKeys.all, "detail", id] as const,
  relapses: (id: string) => [...addictionKeys.all, "relapses", id] as const,
};

export function useAddictions() {
  return useQuery({ queryKey: addictionKeys.list(), queryFn: repo.listAddictions });
}

export function useAddiction(id: string | null) {
  return useQuery({ queryKey: addictionKeys.detail(id ?? ""), queryFn: () => repo.getAddiction(id!), enabled: !!id });
}

export function useRelapses(addictionId: string | null) {
  return useQuery({ queryKey: addictionKeys.relapses(addictionId ?? ""), queryFn: () => repo.listRelapses(addictionId!), enabled: !!addictionId });
}

export function useCreateAddiction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddictionInput) => repo.createAddiction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: addictionKeys.all }),
  });
}

export function useUpdateAddiction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AddictionInput> }) => repo.updateAddiction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: addictionKeys.all }),
  });
}

export function useDeleteAddiction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteAddiction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: addictionKeys.all }),
  });
}

export function useRegisterRelapse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ addictionId, fallenAt, reason }: { addictionId: string; fallenAt: string; reason: string | null }) =>
      repo.registerRelapse(addictionId, fallenAt, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: addictionKeys.all }),
  });
}

export function useDeleteRelapse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteRelapse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: addictionKeys.all }),
  });
}
