"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { ContractDraft } from "./repo";
import type { TimeSlot } from "@/types/models";

export const contractKeys = {
  all: ["contract"] as const,
  active: () => [...contractKeys.all, "active"] as const,
  list: () => [...contractKeys.all, "list"] as const,
  commitments: (contractId: string) => [...contractKeys.all, "commitments", contractId] as const,
};

export function useActiveContract() {
  return useQuery({ queryKey: contractKeys.active(), queryFn: repo.getActiveContract });
}

export function useContracts() {
  return useQuery({ queryKey: contractKeys.list(), queryFn: repo.listContracts });
}

export function useCommitments(contractId: string | null) {
  return useQuery({
    queryKey: contractKeys.commitments(contractId ?? ""),
    queryFn: () => repo.listCommitments(contractId!),
    enabled: !!contractId,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: ContractDraft) => repo.createContract(draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

export function useUpdateCommitmentSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days, timeSlot }: { id: string; days: number[]; timeSlot: TimeSlot }) => repo.updateCommitmentSchedule(id, days, timeSlot),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}
