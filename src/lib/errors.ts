/**
 * Extracts a human-readable message from a thrown value.
 *
 * Supabase/PostgREST failures are plain objects with a `.message` string
 * (`{ message, details, hint, code }`) — not `Error` instances — for both
 * network-level failures and real database errors alike, since the client
 * only wraps them in the `PostgrestError` class under `.throwOnError()`,
 * which this app doesn't use. A plain `instanceof Error` check misses them
 * and hides the actual reason behind a generic fallback.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}
