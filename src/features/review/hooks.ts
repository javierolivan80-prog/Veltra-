"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Commitment, Contract, WeeklyReview } from "@/types/models";
import type { DoneDaysByKind } from "./aggregate";
import * as repo from "./repo";

export const monthlyReviewKeys = {
  all: ["monthlyReviews"] as const,
  list: (contractId: string) => [...monthlyReviewKeys.all, "list", contractId] as const,
};

export function useMonthlyReviews(contractId: string | null) {
  return useQuery({
    queryKey: monthlyReviewKeys.list(contractId ?? ""),
    queryFn: () => repo.listMonthlyReviews(contractId!),
    enabled: !!contractId,
  });
}

/** Igual que useEnsureLocalWeeklyReview: sin Supabase, Progreso genera la
 *  revisión del mes ya cerrado al abrirse (reglas fijas). En modo nube la
 *  escribe la función programada `monthly-review`. */
export function useEnsureLocalMonthlyReview(contract: Contract | null | undefined, commitments: Commitment[], doneDaysByKind: DoneDaysByKind) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    repo.ensureLocalMonthlyReview(contract, commitments, doneDaysByKind).then(() => {
      if (!cancelled) qc.invalidateQueries({ queryKey: monthlyReviewKeys.list(contract.id) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id, contract?.startedOn, commitments.length]);
}

export const reviewKeys = {
  all: ["weeklyReviews"] as const,
  list: (contractId: string) => [...reviewKeys.all, "list", contractId] as const,
};

export function useReviews(contractId: string | null) {
  return useQuery({
    queryKey: reviewKeys.list(contractId ?? ""),
    queryFn: () => repo.listReviews(contractId!),
    enabled: !!contractId,
  });
}

export function useAcceptProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (review: WeeklyReview) => repo.acceptProposal(review),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
      qc.invalidateQueries({ queryKey: ["contract"] });
    },
  });
}

export function useKeepProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => repo.keepProposal(reviewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

/**
 * Sin Supabase configurado no hay cron que genere la revisión del domingo,
 * así que Progreso la genera al abrirse (reglas fijas, sin IA — ver
 * repo.ensureLocalWeeklyReview). En modo nube esto no hace nada: la fila ya
 * la escribió la función programada, o todavía no toca.
 */
export function useEnsureLocalWeeklyReview(contract: Contract | null | undefined, commitments: Commitment[], doneDaysByKind: DoneDaysByKind) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    repo.ensureLocalWeeklyReview(contract, commitments, doneDaysByKind).then(() => {
      if (!cancelled) qc.invalidateQueries({ queryKey: reviewKeys.list(contract.id) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id, contract?.startedOn, commitments.length]);
}
