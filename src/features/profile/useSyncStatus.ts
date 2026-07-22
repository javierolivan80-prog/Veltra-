import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { pendingCount } from "@/src/lib/sync/queue";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { runSync } from "@/src/lib/sync/syncEngine";

export function useSyncStatus() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const query = useQuery({ queryKey: ["syncPendingCount"], queryFn: pendingCount, refetchInterval: 5000 });

  const sync = async () => {
    setSyncing(true);
    await runSync();
    await qc.invalidateQueries();
    setSyncing(false);
  };

  return { pending: query.data ?? 0, configured: isSupabaseConfigured, syncing, sync };
}
