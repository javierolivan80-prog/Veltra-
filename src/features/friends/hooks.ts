"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import * as repo from "./repo";

export const friendKeys = {
  all: ["friends"] as const,
  code: () => [...friendKeys.all, "code"] as const,
  list: () => [...friendKeys.all, "list"] as const,
  prFeed: () => [...friendKeys.all, "prFeed"] as const,
};

export function useMyInviteCode() {
  return useQuery({ queryKey: friendKeys.code(), queryFn: repo.getMyInviteCode, enabled: isSupabaseConfigured });
}

export function useFriends() {
  return useQuery({ queryKey: friendKeys.list(), queryFn: repo.listFriends, enabled: isSupabaseConfigured });
}

export function useFriendPrFeed() {
  return useQuery({ queryKey: friendKeys.prFeed(), queryFn: () => repo.listFriendPrFeed(), enabled: isSupabaseConfigured });
}

export function useRedeemInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => repo.redeemInviteCode(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: friendKeys.list() }),
  });
}

export function usePushMyProgress() {
  return useMutation({
    mutationFn: repo.pushMyProgress,
    // Sincronización de fondo, no una acción que el usuario haya pedido —
    // si falla (p. ej. sin sesión), no tiene sentido interrumpirle con un
    // toast por algo que no vio.
    meta: { silentGlobalError: true },
  });
}

export function usePushPrEvents() {
  return useMutation({
    mutationFn: ({ displayName, events }: { displayName: string; events: repo.PrEventInput[] }) => repo.pushPrEvents(displayName, events),
    // Igual que el progreso: es un efecto secundario de registrar una
    // serie, no algo que deba interrumpir la celebración del PR con un
    // toast si falla.
    meta: { silentGlobalError: true },
  });
}
