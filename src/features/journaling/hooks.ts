"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todayKey } from "@/lib/date";
import * as repo from "./repo";
import type { JournalEntryInput } from "./repo";

export const journalKeys = {
  all: ["journalEntries"] as const,
  byDate: (date: string) => [...journalKeys.all, "date", date] as const,
  today: () => journalKeys.byDate(todayKey()),
};

export function useJournalEntries() {
  return useQuery({ queryKey: journalKeys.all, queryFn: repo.listJournalEntries });
}

export function useJournalEntryByDate(date: string) {
  return useQuery({ queryKey: journalKeys.byDate(date), queryFn: () => repo.getJournalEntryByDate(date) });
}

export function useUpsertJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JournalEntryInput) => repo.upsertJournalEntry(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: journalKeys.all }),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteJournalEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: journalKeys.all }),
  });
}
