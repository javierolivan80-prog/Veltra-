"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exerciseKeys } from "@/features/exercises/hooks";
import * as repo from "./repo";
import type { AddSetInput } from "./repo";

export const workoutKeys = {
  all: ["workouts"] as const,
  active: () => [...workoutKeys.all, "active"] as const,
  session: (id: string) => [...workoutKeys.all, "session", id] as const,
  sets: (sessionId: string) => [...workoutKeys.all, "sets", sessionId] as const,
  lastSet: (exerciseId: string) => [...workoutKeys.all, "lastSet", exerciseId] as const,
  setsForExercise: (exerciseId: string) => [...workoutKeys.all, "setsForExercise", exerciseId] as const,
  recent: () => [...workoutKeys.all, "recent"] as const,
  streak: () => [...workoutKeys.all, "streak"] as const,
};

export function useActiveSession() {
  return useQuery({ queryKey: workoutKeys.active(), queryFn: repo.getActiveSession });
}

export function useSession(id: string | null) {
  return useQuery({ queryKey: workoutKeys.session(id ?? ""), queryFn: () => repo.getSession(id!), enabled: !!id });
}

export function useSessionSets(sessionId: string | null) {
  return useQuery({ queryKey: workoutKeys.sets(sessionId ?? ""), queryFn: () => repo.getSessionSets(sessionId!), enabled: !!sessionId });
}

export function useLastSetForExercise(exerciseId: string | null, excludeSessionId?: string) {
  return useQuery({
    queryKey: workoutKeys.lastSet(exerciseId ?? ""),
    queryFn: () => repo.getLastSetForExercise(exerciseId!, excludeSessionId),
    enabled: !!exerciseId,
  });
}

export function useSetsForExercise(exerciseId: string | null) {
  return useQuery({ queryKey: workoutKeys.setsForExercise(exerciseId ?? ""), queryFn: () => repo.getSetsForExercise(exerciseId!), enabled: !!exerciseId });
}

export function useRecentSessions(limit = 10) {
  return useQuery({ queryKey: [...workoutKeys.recent(), limit], queryFn: () => repo.listRecentSessions(limit) });
}

export function useCurrentStreak() {
  return useQuery({ queryKey: workoutKeys.streak(), queryFn: repo.currentStreakDays });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, routineName }: { routineId: string | null; routineName: string | null }) => repo.startSession(routineId, routineName),
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.active() }),
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: "completed" | "discarded" }) => repo.endSession(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.all }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutKeys.all });
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useAddSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSetInput) => repo.addSet(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: workoutKeys.sets(variables.sessionId) });
      qc.invalidateQueries({ queryKey: workoutKeys.lastSet(variables.exerciseId) });
      qc.invalidateQueries({ queryKey: workoutKeys.setsForExercise(variables.exerciseId) });
      qc.invalidateQueries({ queryKey: workoutKeys.recent() });
      qc.invalidateQueries({ queryKey: workoutKeys.streak() });
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteSet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutKeys.all });
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useDeleteExerciseFromSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, exerciseId }: { sessionId: string; exerciseId: string }) => repo.deleteExerciseFromSession(sessionId, exerciseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutKeys.all });
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}
