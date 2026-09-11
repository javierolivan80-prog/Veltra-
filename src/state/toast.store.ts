"use client";

import { create } from "zustand";
import { generateId } from "@/lib/id";

export interface ToastEntry {
  id: string;
  message: string;
}

interface ToastState {
  toasts: ToastEntry[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
}

/**
 * Cola global de avisos de error. Existe porque hasta ahora, si una
 * mutación de React Query fallaba (red caída, sesión caducada), la
 * mayoría de la app no mostraba nada — el botón simplemente no parecía
 * hacer nada y el dato nunca se guardaba. El QueryClient (ver
 * lib/queryClient.ts) empuja aquí cualquier error de mutación no
 * silenciado explícitamente, sin que cada formulario tenga que
 * gestionarlo por su cuenta.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message) => set((s) => ({ toasts: [...s.toasts, { id: generateId(), message }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
