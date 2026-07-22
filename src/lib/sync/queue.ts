import { getDb } from "@/src/lib/db/client";
import { generateId } from "@/src/lib/id";

export type SyncOperation = "upsert" | "delete";

/** One pending change per (table, row) — re-queueing a row just refreshes its timestamp instead of piling up duplicates. */
export async function enqueueMutation(table: string, rowId: string, operation: SyncOperation): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_queue WHERE table_name = ? AND row_id = ? AND synced = 0`, [table, rowId]);
  await db.runAsync(`INSERT INTO sync_queue (id, table_name, row_id, operation, payload, created_at, synced) VALUES (?, ?, ?, ?, '{}', ?, 0)`, [
    generateId(),
    table,
    rowId,
    operation,
    new Date().toISOString(),
  ]);
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`);
  return row?.count ?? 0;
}
