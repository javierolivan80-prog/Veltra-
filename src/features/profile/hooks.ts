"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { ProfileInput } from "./repo";

export const profileKeys = {
  profile: ["profile"] as const,
  injuries: ["injuries"] as const,
  bodyWeight: ["bodyWeightLogs"] as const,
};

export function useProfile() {
  return useQuery({ queryKey: profileKeys.profile, queryFn: repo.getProfile });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) => repo.upsertProfile(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.profile }),
  });
}

export function useInjuries() {
  return useQuery({ queryKey: profileKeys.injuries, queryFn: repo.listInjuries });
}

export function useAddInjury() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ area, note }: { area: string; note: string }) => repo.addInjury(area, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.injuries }),
  });
}

export function useToggleInjury() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.toggleInjuryActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.injuries }),
  });
}

export function useDeleteInjury() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteInjury(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.injuries }),
  });
}

export function useBodyWeightLogs() {
  return useQuery({ queryKey: profileKeys.bodyWeight, queryFn: () => repo.listBodyWeightLogs() });
}

export function useAddBodyWeightLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weightKg: number) => repo.addBodyWeightLog(weightKg),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.bodyWeight });
      qc.invalidateQueries({ queryKey: profileKeys.profile });
    },
  });
}

export function useSetRecoveryEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => repo.setRecoveryEnabled(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.profile }),
  });
}

export function useSetFaithEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => repo.setFaithEnabled(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.profile }),
  });
}

export function useUpdateTargetWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kg: number | null) => repo.updateTargetWeight(kg),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.profile }),
  });
}
