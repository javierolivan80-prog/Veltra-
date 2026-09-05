"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState } from "react";
import { ToastHost } from "@/design-system/components/ToastHost";
import { useRegisterServiceWorker } from "@/features/pwa/registerServiceWorker";
import { createQueryClient, OFFLINE_CACHE_MAX_AGE_MS } from "@/lib/queryClient";
import { useAuthStore } from "@/state/auth.store";

// Sin storage real (render en servidor) no hay nada que persistir — un
// persister que no hace nada evita tocar localStorage fuera del navegador.
const NOOP_PERSISTER = { persistClient: async () => {}, restoreClient: async () => undefined, removeClient: async () => {} };

// Persistir a localStorage es lo que hace que Hoy tenga algo que enseñar al
// abrirse sin conexión: sin esto, una recarga en frío pierde toda la caché
// en memoria de React Query y no hay nada que pintar hasta que vuelva la
// red. Se crea una sola vez, no por render.
const persister =
  typeof window !== "undefined" ? createSyncStoragePersister({ storage: window.localStorage, key: "veltra-query-cache" }) : NOOP_PERSISTER;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const init = useAuthStore((s) => s.init);
  useRegisterServiceWorker();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: OFFLINE_CACHE_MAX_AGE_MS }}>
      {children}
      <ToastHost />
    </PersistQueryClientProvider>
  );
}
