import { getSupabaseBrowserClient } from "./client";

/** Throws if called when Supabase isn't configured or no session exists — callers only reach this after checking `isSupabaseConfigured`. */
export async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured in this environment.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated.");
  return data.user.id;
}
