"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";

export const meditationKeys = {
  all: ["meditationSessions"] as const,
};

export function useMeditationSessions() {
  return useQuery({ queryKey: meditationKeys.all, queryFn: repo.listMeditationSessions });
}

export function useAddMeditationSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) => repo.addMeditationSession(durationMinutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: meditationKeys.all }),
  });
}

export function useDeleteMeditationSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteMeditationSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: meditationKeys.all }),
  });
}
