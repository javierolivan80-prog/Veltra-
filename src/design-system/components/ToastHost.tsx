"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import { useToastStore } from "@/state/toast.store";

const AUTO_DISMISS_MS = 6000;

function ToastItem({ id, message }: { id: string; message: string }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2.5 border border-danger/30 bg-danger-bg rounded-2xl px-4 py-3.5 shadow-lg pointer-events-auto max-w-sm"
    >
      <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
      <p className="text-ink text-sm leading-5 flex-1">{message}</p>
      <button onClick={() => dismiss(id)} className="text-ink-faint hover:text-ink shrink-0" aria-label="Descartar">
        <X size={14} />
      </button>
    </motion.div>
  );
}

/** Se monta una sola vez en Providers. Cualquier fallo de mutación en toda
 *  la app (ver MutationCache en lib/queryClient.ts) acaba aquí, sin que
 *  cada pantalla tenga que montar su propio manejo de errores. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none sm:items-end sm:pr-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} message={t.message} />
        ))}
      </AnimatePresence>
    </div>
  );
}
