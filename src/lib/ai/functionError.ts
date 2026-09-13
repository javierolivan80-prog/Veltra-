import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * `supabase.functions.invoke()` swallows the Edge Function's actual response
 * body behind a generic "Edge Function returned a non-2xx status code" —
 * the real `{ error }` JSON only lives on `FunctionsHttpError.context` (the
 * raw fetch Response). Without unwrapping it, every failure looks identical
 * and there's no way to tell a missing secret from a bad request from a
 * timeout.
 */
export async function unwrapFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (typeof body?.error === "string") return new Error(body.error);
  }
  return error instanceof Error ? error : new Error(String(error));
}
