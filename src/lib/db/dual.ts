// Every repo in this app speaks to two stores: the Supabase project when one
// is configured, and the local IndexedDB database otherwise. Both paths have
// to exist — Postgres and IndexedDB are different engines, so there is no
// single query that serves both — but the plumbing around them is always the
// same: pick a path, get a client, map snake_case rows, decide what an error
// means. That plumbing lives here so each repo only writes the two queries.

import type { IDBPDatabase } from "idb";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDb } from "./client";
import type { VeltraDB } from "./schema";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>;
type LocalDb = IDBPDatabase<VeltraDB>;

/** The two fields of a PostgREST response that repos actually read. */
interface PostgrestResult<T> {
  data: T | null;
  error: unknown;
}

/**
 * Runs `cloud` against Supabase when a project is configured, `local` against
 * IndexedDB otherwise.
 *
 * `userId` is passed as a getter rather than a resolved value on purpose:
 * reads don't need it (row-level security scopes them server-side), so only
 * the write paths that actually stamp `user_id` pay for the `getUser()` call.
 */
export async function dual<T>(paths: {
  cloud: (supabase: SupabaseClient, userId: () => Promise<string>) => Promise<T>;
  local: (db: LocalDb) => Promise<T>;
}): Promise<T> {
  if (isSupabaseConfigured) return paths.cloud(getSupabaseBrowserClient()!, requireUserId);
  return paths.local(await getDb());
}

/**
 * Many rows → camelCase models. A failed read yields an empty list, which is
 * how every screen already behaves on error: it shows its empty state instead
 * of breaking. Losing a read is recoverable; the next refetch fixes it.
 */
export function rows<T>(result: PostgrestResult<unknown[]>): T[] {
  if (result.error) return [];
  return (result.data ?? []).map((r) => toCamelCase<T>(r as object));
}

/** One row → a camelCase model, or null when it's missing or the read failed. */
export function row<T>(result: PostgrestResult<unknown>): T | null {
  if (result.error || !result.data) return null;
  return toCamelCase<T>(result.data as object);
}

/**
 * Writes get the opposite treatment to reads: they throw. A dropped write
 * loses whatever the user just entered, so it has to surface rather than fail
 * quietly.
 */
export function ok(result: { error: unknown }): void {
  if (result.error) throw result.error;
}
