import NetInfo from "@react-native-community/netinfo";
import { getDb } from "@/src/lib/db/client";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";

const SYNCED_TABLES = [
  "profile",
  "injuries",
  "body_weight_logs",
  "exercises",
  "routines",
  "routine_exercises",
  "workout_sessions",
  "set_entries",
  "personal_records",
  "conversations",
  "coach_messages",
  "memory_facts",
] as const;

const LAST_PULL_KEY = "veltra_last_pull_at";

let syncing = false;

/** Push every queued local mutation to Supabase. No-ops silently when no project is configured. */
export async function pushPending(): Promise<{ pushed: number; failed: number }> {
  if (!isSupabaseConfigured || !supabase) return { pushed: 0, failed: 0 };
  const db = await getDb();
  const pending = await db.getAllAsync<{ id: string; table_name: string; row_id: string; operation: "upsert" | "delete" }>(
    `SELECT id, table_name, row_id, operation FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC`
  );

  let pushed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      if (item.operation === "delete") {
        const { error } = await supabase.from(item.table_name).delete().eq("id", item.row_id);
        if (error) throw error;
      } else {
        const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${item.table_name} WHERE id = ?`, [item.row_id]);
        if (row) {
          const { error } = await supabase.from(item.table_name).upsert(row);
          if (error) throw error;
        }
      }
      await db.runAsync(`UPDATE sync_queue SET synced = 1 WHERE id = ?`, [item.id]);
      pushed++;
    } catch {
      failed++;
    }
  }

  return { pushed, failed };
}

/** Pull remote rows changed since the last successful pull and upsert them locally (last-write-wins on updated_at). */
export async function pullRemote(): Promise<{ pulled: number }> {
  if (!isSupabaseConfigured || !supabase) return { pulled: 0 };
  const db = await getDb();
  let pulled = 0;

  const lastPullRow = await db.getFirstAsync<{ value: string }>(`SELECT value FROM kv_store WHERE key = ?`, [LAST_PULL_KEY]).catch(() => null);
  const since = lastPullRow?.value ?? "1970-01-01T00:00:00.000Z";

  for (const table of SYNCED_TABLES) {
    const hasUpdatedAt = ["profile", "exercises", "routines", "conversations"].includes(table);
    let query = supabase.from(table).select("*");
    if (hasUpdatedAt) query = query.gt("updated_at", since);
    const { data, error } = await query;
    if (error || !data) continue;

    for (const row of data) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => "?").join(", ");
      const updates = columns.map((c) => `${c} = excluded.${c}`).join(", ");
      await db.runAsync(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`,
        columns.map((c) => row[c])
      );
      pulled++;
    }
  }

  await db.runAsync(`INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [
    LAST_PULL_KEY,
    new Date().toISOString(),
  ]);

  return { pulled };
}

export async function runSync(): Promise<void> {
  if (syncing || !isSupabaseConfigured) return;
  syncing = true;
  try {
    await pushPending();
    await pullRemote();
  } finally {
    syncing = false;
  }
}

let unsubscribe: (() => void) | null = null;

/** Wires sync to fire whenever connectivity is (re)gained. Call once from the root layout. */
export function initSyncOnReconnect(): () => void {
  if (unsubscribe) return unsubscribe;
  let wasOffline = false;
  unsubscribe = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (online && wasOffline) runSync();
    wasOffline = !online;
  });
  return unsubscribe;
}
