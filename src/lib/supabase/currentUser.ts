import { timeoutAfter } from "@/lib/withTimeout";
import { getSupabaseBrowserClient } from "./client";

/** Throws if called when Supabase isn't configured or no session exists — callers only reach this after checking `isSupabaseConfigured`. */
export async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured in this environment.");
  const { data, error } = await Promise.race([
    supabase.auth.getUser(),
    timeoutAfter(15000, "La conexión con Supabase está tardando demasiado. Revisa tu conexión e inténtalo de nuevo."),
  ]);
  if (error || !data.user) throw new Error("Not authenticated.");
  return data.user.id;
}
