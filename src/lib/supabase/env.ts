export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * No live Supabase project is configured in this environment. Every screen
 * still works against the local IndexedDB data layer (see src/lib/db) —
 * this flag only gates cloud auth + sync + the AI edge function.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
