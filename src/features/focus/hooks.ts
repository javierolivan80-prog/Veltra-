"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";

export const focusKeys = {
  all: ["focusSessions"] as const,
};

export function useFocusSessions() {
  return useQuery({ queryKey: focusKeys.all, queryFn: repo.listFocusSessions });
}

export function useAddFocusSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) => repo.addFocusSession(durationMinutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: focusKeys.all }),
  });
}
