import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";

interface AuthState {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  user: null,
  loading: false,
  error: null,

  init: async () => {
    if (get().initialized) return;
    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, initialized: true });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (email, password, fullName) => {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    set({ loading: false, error: error?.message ?? null, session: data.session, user: data.user });
    return error ? { ok: false, error: error.message } : { ok: true };
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false, error: error?.message ?? null, session: data.session, user: data.user });
    return error ? { ok: false, error: error.message } : { ok: true };
  },

  signOut: async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  resetPassword: async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, error: "Supabase no está configurado en este entorno todavía." };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? { ok: false, error: error.message } : { ok: true };
  },
}));
