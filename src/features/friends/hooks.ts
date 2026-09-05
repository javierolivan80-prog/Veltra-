"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import * as repo from "./repo";

export const friendKeys = {
  all: ["friends"] as const,
  code: () => [...friendKeys.all, "code"] as const,
  list: () => [...friendKeys.all, "list"] as const,
};

export function useMyInviteCode() {
  return useQuery({ queryKey: friendKeys.code(), queryFn: repo.getMyInviteCode, enabled: isSupabaseConfigured });
}

export function useFriends() {
  return useQuery({ queryKey: friendKeys.list(), queryFn: repo.listFriends, enabled: isSupabaseConfigured });
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
