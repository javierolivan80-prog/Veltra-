"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyzePhysiqueCheckin } from "@/lib/ai/physiqueClient";
import * as repo from "./repo";
import type { PhysiquePose } from "@/types/models";

export const physiqueKeys = {
  all: ["physique"] as const,
  photos: () => [...physiqueKeys.all, "photos"] as const,
  photosByDate: (date: string) => [...physiqueKeys.photos(), "byDate", date] as const,
  checkins: () => [...physiqueKeys.all, "checkins"] as const,
  checkinByDate: (date: string) => [...physiqueKeys.checkins(), "byDate", date] as const,
};

export function useListPhysiquePhotos() {
  return useQuery({ queryKey: physiqueKeys.photos(), queryFn: repo.listPhysiquePhotos });
}

export function usePhysiquePhotosForDate(date: string) {
  return useQuery({ queryKey: physiqueKeys.photosByDate(date), queryFn: () => repo.listPhysiquePhotosForDate(date) });
}

export function useAddPhysiquePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, pose, dataUrl }: { date: string; pose: PhysiquePose; dataUrl: string }) => repo.addPhysiquePhoto(date, pose, dataUrl),
    retry: 2,
    retryDelay: 1000,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: physiqueKeys.photos() });
      qc.invalidateQueries({ queryKey: physiqueKeys.photosByDate(variables.date) });
    },
  });
}

export function useDeletePhysiquePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; date: string }) => repo.deletePhysiquePhoto(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: physiqueKeys.photos() });
      qc.invalidateQueries({ queryKey: physiqueKeys.photosByDate(variables.date) });
    },
  });
}

export function useListPhysiqueCheckins() {
  return useQuery({ queryKey: physiqueKeys.checkins(), queryFn: repo.listPhysiqueCheckins });
}

export function usePhysiqueCheckinByDate(date: string) {
  return useQuery({ queryKey: physiqueKeys.checkinByDate(date), queryFn: () => repo.getPhysiqueCheckinByDate(date) });
}

/** Sin retry automático a propósito: es una llamada de IA cara y, si falla,
 *  el usuario decide si vuelve a pulsar "Analizar" — no lo reintentamos solos. */
export function useAnalyzePhysiqueCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => analyzePhysiqueCheckin(date),
    onSuccess: (_data, date) => {
      qc.invalidateQueries({ queryKey: physiqueKeys.checkins() });
      qc.invalidateQueries({ queryKey: physiqueKeys.checkinByDate(date) });
    },
  });
}
