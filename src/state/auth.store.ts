"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { timeoutAfter } from "@/lib/withTimeout";

const AUTH_TIMEOUT_MS = 15000;
const AUTH_TIMEOUT_MESSAGE = "La conexión está tardando demasiado. Revisa tu conexión e inténtalo de nuevo.";

interface AuthState {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ ok: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  user: null,
  loading: false,
  error: null,

  init: async () => {
    if (get().initialized) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      set({ initialized: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, initialized: true });
    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (email, password, fullName) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    set({ loading: true, error: null });
    try {
      const { data, error } = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined },
        }),
        timeoutAfter(AUTH_TIMEOUT_MS, AUTH_TIMEOUT_MESSAGE),
      ]);
      set({ loading: false, error: error?.message ?? null, session: data.session, user: data.user });
      if (error) return { ok: false, error: error.message };
      // Supabase returns a user with no session when email confirmation is required.
      return { ok: true, needsEmailConfirmation: !data.session };
    } catch (err) {
      const message = err instanceof Error ? err.message : AUTH_TIMEOUT_MESSAGE;
      set({ loading: false, error: message });
      return { ok: false, error: message };
    }
  },

  signIn: async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    set({ loading: true, error: null });
    try {
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutAfter(AUTH_TIMEOUT_MS, AUTH_TIMEOUT_MESSAGE),
      ]);
      set({ loading: false, error: error?.message ?? null, session: data.session, user: data.user });
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : AUTH_TIMEOUT_MESSAGE;
      set({ loading: false, error: message });
      return { ok: false, error: message };
    }
  },

  signOut: async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  resetPassword: async (email) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  },

  updatePassword: async (password) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { ok: false, error: error.message } : { ok: true };
  },
}));

